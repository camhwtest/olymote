# Install on a Raspberry Pi 4
sudo apt-get install git gcc g++ make
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Olympus Bluetooth App Protocol

This is by no means official documentation - simply what I have observed from reverse-engineering the bluetooth communication between an Olympus OM-1 and the OI.Share Android app

Bluetooth device addresses start with D0:17:69

Primary BLE service UUID is "adc505f9-4e58-4b71-b8ca-983bb8c73e4f"

Main command characteristic is "82f949b4-f5dc-4cf3-ab3c-fd9fd4017b68"

Commands written to command characteristic consist of:
- counter: byte (initialized to 1 incremented after each command is written)
- command_identifier_1: byte
- command_identifier_2: byte
- payload: byte[]

To write a command, write the following byte array to the command characteristic:
[
    0x01,
    counter % 256,
    payload.length + 3,
    command_identifier_1,
    0x01,
    command_identifier_2,
    ...payload,
    sum(command_identifier_1, command_identifier_2, 0x01, ...payload) % 256,
    0x00    
]

Two other characteristics are also available in the service:

One of them appears to be some sort of status notifier, UUID "b7a8015c-cb94-4efa-bda2-b7921fa9951f"
The other one is unknown, UUID "05a02050-0860-4919-8add-9801fba8b6ed"

Upon connecting, the app enables BLE notify on all three characteristics.
This does not appear to be required for remote shutter release.

Every time a notification is sent to the status characteristic, the app responds by writing the following bytes to the status characteristic:
[
    0x02,
    notification_payload[1],
    0x00,
    0x00,
    0x00
]

This also does not appear to be required for remote shutter release.

To enable remote shutter release, an initialization command must be sent:
{
    command_identifier_1: 0x0C,
    command_identifier_2: 0x02,
    payload: [0x38,0x30,0x30,0x32,0x38,0x36]
}

The app sends a second initalization command, however it does not appear to be necessary for remote shutter release:
{
    command_identifier_1: 0x1D,
    command_identifier_2: 0x01,
    payload: [0x01]
}


Once initialized, to push down the shutter button, send the following command:
{
    command_identifier_1: 0x04,
    command_identifier_2: 0x0F,
    payload: [0x05]
}

To release the shutter button, send the following command:
{
    command_identifier_1: 0x04,
    command_identifier_2: 0x0F,
    payload: [0x06]
}

Pushing down and releasing the shutter button can be done multiple times while you remain connected
