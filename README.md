# device-server
Server that listens for incoming connections from IoT devices and checks for required updates and provides the data to the device if necessary

to use:

1. Replace the top variables with your database info
2. run npm install
3. node server.js


server listens on port 24400
1. Device connects to service
2. Device sends "update <deviceid>"
3. Server returns true or false
4. On true, device sends "ack send" || on false, device ends connection
5. Server queries database and returns the values to the device
6. After device validates the data, device sends "ack receipt" to end the connection
