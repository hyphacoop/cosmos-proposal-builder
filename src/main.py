from datetime import datetime, timezone, timedelta
from pathlib import Path
import base64
import binascii
import json
import os
import re
import secrets
import requests
from nicegui import app, run, ui
import markdownify

REQUEST_TIMEOUT = 10

chain_endpoints = {
    'Hub Testnet': 'https://rpc.provider-sentry-01.hub-testnet.polypore.xyz',
    'Cosmos Hub': 'https://rpc.sentry-01.cosmoshub-4.polypore.xyz'
}

TARGET_PLATFORMS = ['darwin-amd64', 'linux-amd64']

def find_sample_text():
    # sample-text.md sits next to main.py in the container, and at the repo root locally
    here = Path(__file__).resolve().parent
    for directory in (here, here.parent):
        candidate = directory / 'sample-text.md'
        if candidate.exists():
            return candidate
    return None

def find_platform(name: str):
    # Match '<...>-darwin-amd64' at the end of the name or before a '/'
    # e.g. 'gaiad-v29.0.0-darwin-amd64' or './gaiad-darwin-amd64/gaiad', but not '.asc' files
    for platform in TARGET_PLATFORMS:
        if re.search(rf'-{platform}(?:$|/)', name):
            return platform
    return None

def fetch_upgrade_info(tag: str):
    response = requests.get(f'https://api.github.com/repos/cosmos/gaia/releases/tags/{tag}',
                            timeout=REQUEST_TIMEOUT)
    if not response.ok:
        raise ValueError(f'Could not fetch release {tag}')
    assets = response.json()['assets']
    checksums = {}
    binaries = {}

    for asset in assets:
        if 'SHA256SUMS' in asset['name']:
            # Collect shasums, keyed by platform
            file_request = requests.get(asset['browser_download_url'], timeout=REQUEST_TIMEOUT).text
            for line in file_request.splitlines():
                parts = line.split()
                if len(parts) != 2:
                    continue
                platform = find_platform(parts[1])
                if platform:
                    checksums[platform] = parts[0]

    for asset in assets:
        platform = find_platform(asset['name'])
        if not platform:
            continue
        binaries[platform] = {
            'url': asset['browser_download_url'],
            'checksum': checksums.get(platform),
            'target': platform.replace('-', '/')
        }

    missing = [p for p in TARGET_PLATFORMS if p not in binaries or not binaries[p]['checksum']]
    if missing:
        raise ValueError(f'Missing binary or checksum for: {", ".join(missing)}')

    # Generate info field
    info_field = {
        'binaries':
            {data['target']: f'{data["url"]}?checksum=sha256:{data["checksum"]}' for _, data in  binaries.items()}
        }
    return json.dumps(info_field)

def time_diff_seconds(timestamp1: str, timestamp2: str):
    datetime1 = datetime.strptime(timestamp1, '%Y-%m-%dT%H:%M:%S.%f')
    datetime2 = datetime.strptime(timestamp2, '%Y-%m-%dT%H:%M:%S.%f')
    time_diff = datetime2 - datetime1
    return time_diff.total_seconds()

def get_block(rpc: str, height: int = None):
    url = rpc + '/block' if height is None else rpc + f'/block?height={height}'
    response = requests.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response.json()

def collect_block_times(start, end, step, rpc):
    diffs = []
    for height in range(start, end, step):
        block_data = get_block(rpc, height)
        previous_block_data = get_block(rpc, height - 1)

        diff = time_diff_seconds(previous_block_data['result']['block']['header']['time'][:25],
                          block_data['result']['block']['header']['time'][:25])
        diffs.append(diff)
    return diffs

def fetch_average_block_time(rpc: str, look_back: int, step_size: int):
    # Returns (current height, average block time in seconds)
    current_block_data = get_block(rpc)
    current_block = int(current_block_data['result']['block']['header']['height'])
    diffs = collect_block_times(current_block-look_back, current_block, step_size, rpc)
    return current_block, sum(diffs) / len(diffs)

class BasicAuthMiddleware:
    """Require HTTP basic auth on every request except the health check."""

    def __init__(self, asgi_app, username: str, password: str):
        self.app = asgi_app
        self.username = username.encode()
        self.password = password.encode()

    def is_authorized(self, scope) -> bool:
        headers = dict(scope.get('headers', []))
        scheme, _, encoded = headers.get(b'authorization', b'').partition(b' ')
        if scheme.lower() != b'basic':
            return False
        try:
            username, _, password = base64.b64decode(encoded, validate=True).partition(b':')
        except (binascii.Error, ValueError):
            return False
        # Evaluate both comparisons to avoid leaking which one failed
        username_ok = secrets.compare_digest(username, self.username)
        password_ok = secrets.compare_digest(password, self.password)
        return username_ok and password_ok

    async def __call__(self, scope, receive, send):
        if scope['type'] not in ('http', 'websocket') or scope['path'] == '/healthz' \
                or self.is_authorized(scope):
            await self.app(scope, receive, send)
            return
        if scope['type'] == 'websocket':
            await send({'type': 'websocket.close', 'code': 1008})
            return
        await send({
            'type': 'http.response.start',
            'status': 401,
            'headers': [(b'www-authenticate', b'Basic realm="Proposal Builder"'),
                        (b'content-type', b'text/plain')],
        })
        await send({'type': 'http.response.body', 'body': b'Unauthorized'})

auth_username = os.getenv('BASIC_AUTH_USERNAME')
auth_password = os.getenv('BASIC_AUTH_PASSWORD')
if auth_username and auth_password:
    app.add_middleware(BasicAuthMiddleware, username=auth_username, password=auth_password)

@app.get('/healthz')
def healthz():
    return {'status': 'ok'}

@ui.page('/', title='Cosmos Proposal Builder')
def index():
    def populate():
        input_upgrade_name.value = 'v29.0.0'
        input_release_tag.value = input_upgrade_name.value
        input_target_time.value = (datetime.now()+timedelta(days=1)).replace(tzinfo=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        input_upgrade_height.value = '50'
        input_deposit.value = '50100000'
        sample_text = find_sample_text()
        if sample_text:
            textarea_proposal_md.set_value(sample_text.read_text(encoding='utf-8'))

    def set_endpoint(chain: str):
        input_rpc_endpoint.value = chain_endpoints[chain]

    async def estimate_upgrade_height():
        desired_time = input_target_time.value
        rpc = input_rpc_endpoint.value
        if not desired_time or not rpc:
            ui.notify('Enter an RPC endpoint and a desired time')
            return
        spinner_height_calculation.set_visibility(True)
        ui.notify("Estimating block height, please wait...")
        try:
            # Get current block height and average block time
            look_back = int(number_past_blocks.value)
            step_size = int(number_skip_blocks.value)
            current_block, average_block_time = await run.io_bound(
                fetch_average_block_time, rpc, look_back, step_size)

            # Estimate the number of blocks it will take to traverse
            desired_datetime = datetime.strptime(desired_time, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
            time_diff = (desired_datetime - datetime.now(timezone.utc)).total_seconds()
            estimated_block_count = int(time_diff / average_block_time)
            tentative_block_height= current_block + estimated_block_count

            # Round to the next 100
            rounded = (( tentative_block_height + 99) // 100) * 100
            input_upgrade_height.value = str(rounded)
            ui.notify(f'Estimated upgrade height: {rounded}')
        except (requests.RequestException, KeyError, ValueError, ZeroDivisionError) as e:
            ui.notify(f'Could not estimate upgrade height: {e}', type='negative')
        finally:
            spinner_height_calculation.set_visibility(False)

    async def generate_proposal_json():
        version = input_upgrade_name.value
        md_proposal = textarea_proposal_md.value
        description = md_proposal.replace('\n','\r\n')
        height = input_upgrade_height.value
        try:
            info_json = await run.io_bound(fetch_upgrade_info, input_release_tag.value)
        except (requests.RequestException, KeyError, ValueError) as e:
            ui.notify(str(e), type='negative')
            return
        deposit = input_deposit.value
        denom = input_denom.value

        proposal_content = {
        'messages': [
                {
                    '@type': '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade',
                    'authority': 'cosmos10d07y265gmmuvt4z0w9aw880jnsr700j6zn9kn',
                    'plan': {
                        "name": version,
                        "time": "0001-01-01T00:00:00Z",
                        "height": height,
                        'info': info_json,
                        'upgraded_client_state': None
                    }
                }
            ],
            "metadata": "ipfs://CID",
            "deposit": deposit+denom,
            "title": f'Gaia {version} Upgrade',
            "summary": description,
            "expedited": True
        }
        textarea_proposal_json.set_value(json.dumps(proposal_content, indent=4))

    ui.colors(primary='#8800EB')
    label_title = ui.label('Cosmos Proposal Builder')
    label_title.tailwind('text-2xl')

    with ui.tabs().classes('flex') as tabs:
        tab_one = ui.tab('Proposal text')
        tab_two = ui.tab('Upgrade height')
        tab_three = ui.tab('Deposit')
        tab_four = ui.tab('Proposal JSON')
    with ui.tab_panels(tabs, value=tab_one).classes('w-full content-left'):
        with ui.tab_panel(tab_one):
            # 1. Proposal text
            input_upgrade_name = ui.input(label='Upgrade name')
            input_release_tag = ui.input(label='Release tag')
            textarea_proposal_md = ui.textarea(label='Proposal Markdown',
                                               on_change=lambda e: markdown_proposal_render.set_content(e.value))
            textarea_proposal_md.tailwind('pb-4')
            textarea_proposal_md.classes('full-width')
            label_proposal_render = ui.label('Rendered markdown:')
            label_proposal_render.tailwind('text-lg font-bold')
            markdown_proposal_render = ui.markdown()
        with ui.tab_panel(tab_two):
            # 2. Height
            with ui.column().classes('full-width'):
                select_chain = ui.select(list(chain_endpoints.keys()),
                                         value=list(chain_endpoints.keys())[0],
                                         on_change=lambda e: set_endpoint(e.value)).classes('full-width')
                input_rpc_endpoint = ui.input(label='RPC endpoint',
                                              placeholder='https://provider-sentry-01.hub-testnet.polypore.xyz').classes('full-width')
                input_target_time = ui.input(label='Target upgrade time',
                                             placeholder='2023-10-15T14:00:00Z').classes('full-width')
                number_past_blocks = ui.number(label = 'Stop this many blocks in the past',
                                               value = 1000,
                                               min = 100,
                                               max = 10000,
                                               step = 10,
                                               format='%d').classes('full-width')
                number_skip_blocks = ui.number(label = 'Skip this many blocks in between time checks',
                                               value = 50,
                                               min = 1,
                                               max = 1000,
                                               step = 1,
                                               format = '%d').classes('full-width')
                number_skip_blocks.tailwind('pb-4')

            with ui.row():
                button_estimate_height = ui.button('Estimate height', on_click=estimate_upgrade_height)
                spinner_height_calculation = ui.spinner(size='lg')
                spinner_height_calculation.set_visibility(False)
            input_upgrade_height = ui.input(label='Upgrade height')
            set_endpoint(list(chain_endpoints.keys())[0])
        with ui.tab_panel(tab_three):
            # 3. Parameters
            input_deposit = ui.input(label='Initial deposit')
            input_denom = ui.input(label='Denom', value = 'uatom')
        with ui.tab_panel(tab_four):
            # 4. Proposal
            button_generate_proposal = ui.button('Generate JSON', on_click=generate_proposal_json)
            textarea_proposal_json = ui.textarea(label="Proposal JSON").classes('full-width')
            textarea_proposal_json.tailwind('w-4/5')

    populate()

ui.run(host=os.getenv('HOST', '0.0.0.0'),
       port=int(os.getenv('PORT', '8080')),
       reload=False,
       show=os.getenv('OPEN_BROWSER', 'true').lower() == 'true',
       title='Cosmos Proposal Builder')
