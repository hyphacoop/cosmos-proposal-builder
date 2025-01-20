from datetime import datetime, timezone, timedelta
import asyncio
import requests
import json
from nicegui import ui
import markdownify

version = ''
tag = ''

chain_endpoints = {
    'ICS Testnet': 'https://rpc.provider-sentry-01.ics-testnet.polypore.xyz',
    'Cosmos Hub': 'https://rpc.one.cosmos-mainnet.polypore.xyz'
}

def populate():
    input_upgrade_name.value = 'v22'
    input_release_tag.value = input_upgrade_name.value + '.0.0-rc0'
    input_target_time.value = (datetime.now()+timedelta(days=1)).replace(tzinfo=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    input_upgrade_height.value = '50'
    input_deposit.value = '50100000'
    with open('sample-text.md', 'r', encoding='utf-8') as input_markdown:
        textarea_proposal_md.set_value(input_markdown.read())
    ui.colors(primary='#8800EB')
    ui.page_title('Cosmos Proposal Builder')

def generate_upgrade_info():
    tag = input_release_tag.value
    response = requests.get(f'https://api.github.com/repos/cosmos/gaia/releases/tags/{tag}')
    if not response.ok:
        return
    response = response.json()
    assets = response['assets']
    checksums = {}
    binaries = {}
    
    for asset in assets:
        if 'SHA256SUMS' in asset['name']:
            # Collect shasums
            file_request = requests.get(asset['browser_download_url']).text
            lines = file_request.split('\n')
            for line in lines:
                if line:
                    checksum = line.split()
                    checksums[checksum[1]] = checksum[0]

    for asset in assets:
        if 'SHA256SUMS' not in asset['name']:
            target = '/'.join(asset['name'].split('-')[-2:])
            target = target.split('.')[0]
            binaries[asset['name']] = {
                'url': asset['browser_download_url'],
                'checksum': checksums[asset['name']],
                'target': target
            }

    # Generate info field
    info_field = {
        'binaries': 
            {data['target']: f'{data["url"]}?checksum=sha256:{data["checksum"]}' for _, data in  binaries.items()}
        }
    info_json = json.dumps(info_field)
    return info_json

def set_endpoint(chain: str):
    input_rpc_endpoint.value = chain_endpoints[chain]

def time_diff_seconds(timestamp1: str, timestamp2: str):
    datetime1 = datetime.strptime(timestamp1, '%Y-%m-%dT%H:%M:%S.%f')
    datetime2 = datetime.strptime(timestamp2, '%Y-%m-%dT%H:%M:%S.%f')
    time_diff = datetime2 - datetime1
    return time_diff.total_seconds()

def collect_block_times(start, end, step, rpc):
    diffs = []
    for height in range(start, end, step):
        block_data = requests.get(rpc + f'/block?height={height}')
        block_data = block_data.json()
        previous_block_data = requests.get(rpc + f'/block?height={height-1}')
        previous_block_data = previous_block_data.json()

        diff = time_diff_seconds(previous_block_data['result']['block']['header']['time'][:25],
                          block_data['result']['block']['header']['time'][:25])
        diffs.append(diff)
    return diffs

async def estimate_upgrade_height():
    spinner_height_calculation.set_visibility(True)
    ui.notify("Estimating block height, please wait...")
    await asyncio.sleep(0.05)
    # Get current block height
    look_back = int(number_past_blocks.value)
    step_size = int(number_skip_blocks.value)
    desired_time = input_target_time.value
    rpc = input_rpc_endpoint.value
    if not desired_time or not rpc:
        spinner_height_calculation.set_visibility(False)
        ui.notify(f'Enter an RPC endpoint and a desired time')
        return
    
    url = rpc + '/block'
    current_block_data = requests.get(url)
    current_block_data = current_block_data.json()
    current_block = int(current_block_data['result']['block']['header']['height'])
    diffs = collect_block_times(current_block-look_back, current_block, step_size, rpc)
    average_block_time = sum(diffs) / len(diffs)
    
    # Estimate the number of blocks it will take to traverse
    desired_datetime = datetime.strptime(desired_time, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    time_diff = (desired_datetime - datetime.now(timezone.utc)).total_seconds()
    estimated_block_count = int(time_diff / average_block_time)
    tentative_block_height= current_block + estimated_block_count
    
    # Round to the next 100
    rounded = (( tentative_block_height + 99) // 100) * 100
    input_upgrade_height.value = str(rounded)
    spinner_height_calculation.set_visibility(False)
    ui.notify(f'Estimated upgrade height: {rounded}')

def generate_proposal_json():
    version = input_upgrade_name.value
    md_proposal = textarea_proposal_md.value
    description = md_proposal.replace('\n','\r\n')
    height = input_upgrade_height.value
    info_json = generate_upgrade_info()
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
            select_chain = ui.select(['ICS Testnet', 'Cosmos Hub'],
                                     value='ICS Testnet',
                                     on_change=lambda e: set_endpoint(e.value)).classes('full-width')
            input_rpc_endpoint = ui.input(label='RPC endpoint',
                                          placeholder='https://provider-sentry-01.ics-testnet.polypore.xyz').classes('full-width')
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
ui.run()
