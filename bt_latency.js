const {createBluetooth} = require('node-ble');
const Gpio = require('onoff').Gpio;

const SERVICE_UUID = "adc505f9-4e58-4b71-b8ca-983bb8c73e4f";

let commandCounter = 1
const makeCommandBytes = ([cmdA, cmdB, payload]) => {
    const cmdBytes = [
        0x01,
        commandCounter % 256,
        payload.length + 3,
        cmdA,
        0x01,
        cmdB,
        ...payload,
        [cmdA, cmdB, 0x01, ...payload].reduce((a,b)=>a+b)%256,
        0x00
    ];
    commandCounter = commandCounter + 1;
    return Buffer.from(cmdBytes);
}

const COMMAND_CHARACTERISTIC_UUID = "82f949b4-f5dc-4cf3-ab3c-fd9fd4017b68"
const COMMANDS = {
    "INIT_1": [0x0C, 0x02, [0x38,0x30,0x30,0x32,0x38,0x36]],
    "INIT_2": [0x1D, 0x01, [0x01]],
    "SHUTTER_BUTTON_DOWN": [0x04, 0x0F, [0x05]],
    "SHUTTER_BUTTON_UP": [0x04, 0x0F, [0x06]]
}




let pingValue = Buffer.from([0x04,0x02,0x04,0x0c,0x01,0x02,0x00,0x0f,0x00])
const makePongBytes = () => {
    return Buffer.from([0x02, pingValue[1], 0x00, 0x00, 0x00])
}

const PING_CHARACTERISTIC_UUID = "b7a8015c-cb94-4efa-bda2-b7921fa9951f"

const UNKNOWN_A_CHARACTERISTIC_UUID = "05a02050-0860-4919-8add-9801fba8b6ed"


//OPTIONAL: enable notification COMMAND_CHARACTERISTIC_UUID
//OPTIONAL: enable notification PING_CHARACTERISTIC_UUID
//OPTIONAL: enable notification UNKNOWN_A_CHARACTERISTIC_UUID
//OPTIONAL: on PING_CHARACTERISTIC_UUID notification, write makePongBytes() to PING_CHARACTERISTIC_UUID

//REQUIRED: write makeCommandBytes(COMMANDS.INIT_1) to COMMAND_CHARACTERISTIC_UUID
//OPTIONAL: write makeCommandBytes(COMMANDS.INIT_2) to COMMAND_CHARACTERISTIC_UUID


// To trigger shutter:
// write makeCommandBytes(COMMANDS.SHUTTER_BUTTON_DOWN) to COMMAND_CHARACTERISTIC_UUID
// write makeCommandBytes(COMMANDS.SHUTTER_BUTTON_UP) to COMMAND_CHARACTERISTIC_UUID




const delay = (millis) => {
    return new Promise(res => {
        setTimeout(res, millis)
    })
}


const main = async () => {

    const LEDS = [
        new Gpio(16, 'out'),
        new Gpio(20, 'out'),
        new Gpio(26, 'out'),
        new Gpio(21, 'out'),
        new Gpio(5, 'out'),
        new Gpio(6, 'out'),
        new Gpio(13, 'out'),
        new Gpio(19, 'out')
    ]


    console.log('creating bluetooth')
    const {bluetooth, destroy} = createBluetooth()

    console.log('fetching adapter')
    const adapter = await bluetooth.defaultAdapter()

    console.log('checking discovery')
    if(! await adapter.isDiscovering()) {
        console.log('starting discovery')
        await adapter.startDiscovery()
    }

    let deviceUuid = null;
    while(!deviceUuid) {
        await delay(1000);
        const devices = await adapter.devices();
        console.log(`found devices ${devices}`)
        deviceUuid = devices.filter(d => d.startsWith("D0:17:69"))[0];
    }

    console.log(`getting device ${deviceUuid}`)
    const device = await adapter.getDevice(deviceUuid)
    
    console.log('stopping discovery')
    await adapter.stopDiscovery()

    console.log('checking device connected')
    while(!await device.isConnected()) {
        try {
            console.log('connecting device')
            await device.connect();
            console.log('device connected')
            connected = true
        } catch (e) {
            console.log(`error connecting device: ${e}`)
            await device.disconnect()
            console.log('device disconnected')
        }
    }

    console.log('gatt server')
    const gattServer = await device.gatt()
    console.log(`gatt services: ${await gattServer.services()}`)

    console.log('primary service')
    const service = await gattServer.getPrimaryService(SERVICE_UUID);
    console.log(`gatt services: ${await service.characteristics()}`)

    console.log('command characteristic')
    const commandCharacteristic = await service.getCharacteristic(COMMAND_CHARACTERISTIC_UUID);


    await delay(1000)
    console.log('writing init_1')
    await commandCharacteristic.writeValue(makeCommandBytes(COMMANDS.INIT_1), {type: 'command'})



    // Initialize 
    for(i = 0; i<LEDS.length; i++) {
        LEDS[i].writeSync(0);
    }
    await delay(1000)
    console.log('writing shutter_button_down')
    const shutter_down = commandCharacteristic.writeValue(makeCommandBytes(COMMANDS.SHUTTER_BUTTON_DOWN), {type: 'command'})

    const delayMs = [
        80,
        10,
        10,
        10,
        10,
        10,
        10,
        10
    ]

    await shutter_down;

    // Count up
    for(i = 0; i<LEDS.length; i++) {
        await delay(delayMs[i]);
        LEDS[i].writeSync(1);
    }

    await delay(10)
    console.log('writing shutter_button_up')
    await commandCharacteristic.writeValue(makeCommandBytes(COMMANDS.SHUTTER_BUTTON_UP), {type: 'command'})


    await delay(1000)
    console.log('disconnecting device')
    await device.disconnect();

    console.log('destroying bluetooth')
    await destroy();
    


};
main();

