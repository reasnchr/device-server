const net = require('net');
const pg = require('pg');



var    SERVER_PORT = 24400;
var    DB_HOST     = 'PSQL_HOST';   // replace with hostname or IP
var    DB_PORT     = 5432;          // default PSQL port
var    DB_DATABASE = 'DATABASE_DB'; // replace with database name
var    DB_USER     = 'DB_USER';     // replace with database user
var    DB_PASSWORD = 'DB_PASSWORD'; // replace with database user password

const pool = new pg.Pool({
        user: DB_USER,
        password: DB_PASSWORD,
        host: DB_HOST,
        port: DB_PORT,
        database: DB_DATABASE
});

var Device = {
};

var server = net.createServer();
server.listen(SERVER_PORT, function() {
    console.log("Server listening for connections on port " + SERVER_PORT);
});

let sockets = [];
server.on('connection', function(socket) {
        console.log('CONNECTED ' + socket.remoteAddress + ':' + socket.remotePort );
        sockets.push(socket);
        var device = Object.create(Device);

        socket.on('data', function(data) {
            console.log('DATA ' + socket.remoteAddress + ': ' + data);
            var dataText = data.toString();
            var dataStr  = dataText.split(" ");
            var cmd      = dataStr[0];
            var param    = dataStr[1];
            switch(cmd) {
                case "update":
                    device.device_id = param;
                    console.log('RECEIVED UPDATE REQUEST FOR DEVICE: ' + device.device_id);
                    getFlag(device.device_id, socket, device);
                    break;
                case "ack":
                    if (param == "send"){
                        console.log('RECEIVED ACKNOWLEDGEMENT FROM: ' + device.device_id);
                        console.log("Device ID: " + device.device_id + " Table Row: " + device.row_id);
                        sendParams(device.device_id, socket, device);
                    }
                    if (param == "receipt") {
                        console.log('RECEIVED RECEIVE ACK FROM: ' + device.device_id);
                        deviceUpdated(device, socket);
                    }
                break;
            }
        });


    socket.on('close', function(data) {
        let index = sockets.findIndex(function(o) {
            return o.remoteAddress === socket.remoteAddress && o.remotePort === socket.remotePort;
        })
        if (index !== -1) sockets.splice(index, 1);
            console.log('CLOSED: ' + socket.remoteAddress);
    });
});

function getFlag(deviceID, sock, device) {
    const text             = 'SELECT id, updated_at, last_device_update FROM user_settings WHERE device_id = $1 ORDER BY updated_at DESC LIMIT 1';
    const values           = [deviceID];
    var last_device_update = null;
    var updated_at         = null;

    pool
        .query(text, values)
        .then(res => {
            console.log("querying to create flag for " + deviceID);
            updated_at         = res.rows[0].updated_at;
            last_device_update = res.rows[0].last_device_update;
            device.row_id      = res.rows[0].id;
            if (last_device_update == null || last_device_update < updated_at) { sock.write("true"); } else { sock.write("false"); }
        })
        .catch(err => {
            console.error(err);
        })
        .finally(() => {
        });
}

function sendParams(deviceID, sock, device) {
    const text             = 'SELECT * FROM user_settings WHERE device_id = $1 ORDER BY updated_at DESC LIMIT 1';
    const values           = [deviceID];
    var lf_sensor_id = null;
    var rf_sensor_id = null;
    var lm_sensor_id = null;
    var rm_sensor_id = null;
    var lr_sensor_id = null;
    var rr_sensor_id = null;
    var paramResponse = null;

    var p = {}
    var key = deviceID;
    p[key] = [];

    pool
        .query(text, values)
        .then(res => {
            console.log("querying params for " + deviceID);

            var data = {
                lf_sensor_id: res.rows[0].lf_sensor_id,
                rf_sensor_id: res.rows[0].rf_sensor_id,
                lm_sensor_id: res.rows[0].lm_sensor_id,
                rm_sensor_id: res.rows[0].rm_sensor_id,
                lr_sensor_id: res.rows[0].lr_sensor_id,
                rr_sensor_id: res.rows[0].rr_sensor_id
            };
            p[key].push(data);
        
            sock.write(JSON.stringify(p));
        })
        .catch(err => {
            console.error(err);
        })
        .finally(() => {

        });
}

function deviceUpdated(device, sock) {
    var rightNow           = getDate();
    const text             = 'UPDATE user_settings SET last_device_update = $1 WHERE id = $2;';
    const values           = [rightNow, device.row_id];

    pool
        .query(text, values)
        .then(res => {
            console.log("Updating last device update column for " + device.device_id);
            sock.end();
            console.log("Disconected client " + sock.remoteAddress);
        })
        .catch(err => {
            console.error(err);
        })
        .finally(() => {
        });
}


function getDate() {
    let date_ob = new Date();

    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();   
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds();

    return(year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
}
