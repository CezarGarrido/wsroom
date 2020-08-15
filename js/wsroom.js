function WsRoom(url) {
    let state = {
        Socket = null;
        observers = {};
    }

    state.Socket = new WebSocket(url);

    state.Socket.onopen = function(event) {
        console.log("[OPEN]", event.data);
    };

    state.Socket.onmessage = function(event) {
        let msg = JSON.parse(event.data);
        if (msg.Type === "server:error") {
            notifyAll(msg.Type, msg.Body);
            return;
        }
        try {
            notifyAll(msg.Type, JSON.parse(msg.Body));
        } catch {
            notifyAll(msg.Type, msg.Body);
        }
    };

    state.Socket.onclose = function() {
        console.log("[CLOSE]");
        state.Socket = null;
        console.log("[RETRY]");
        setTimeout(startWebsocket(url), 5000);
    };

    function notifyAll(type, payload) {
        Object.keys(observers).forEach(function(key) {
            if (type == key) {
                observers[key](payload)
            }
        })
    }

    function On(eventName, callback) {
        state.observers[eventName] = callback;
    }

    function Emit(eventName, body) {
        let message = {};
        message.type = eventName;
        message.body = string2Bin(body);
        let msg = JSON.stringify(message);
        state.Socket.send(msg);
    }

    function string2Bin(parameter) {
        let str = JSON.stringify(parameter);
        return stringToUtf8ByteArray(str);
    }

    function bin2String(array) {
        return utf8ByteArrayToString(array);
    }

    function stringToUtf8ByteArray(str) {
        // TODO(user): Use native implementations if/when available
        //https://github.com/google/closure-library/blob/8598d87242af59aac233270742c8984e2b2bdbe0/closure/goog/crypt/crypt.js#L117-L143
        var out = [],
            p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 128) {
                out[p++] = c;
            } else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            } else if (
                (c & 0xfc00) == 0xd800 &&
                i + 1 < str.length &&
                (str.charCodeAt(i + 1) & 0xfc00) == 0xdc00
            ) {
                // Surrogate Pair
                c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            } else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    }

    function utf8ByteArrayToString(bytes) {
        // TODO(user): Use native implementations if/when available
        let out = [],
            pos = 0,
            c = 0;
        while (pos < bytes.length) {
            let c1 = bytes[pos++];
            if (c1 < 128) {
                out[c++] = String.fromCharCode(c1);
            } else if (c1 > 191 && c1 < 224) {
                let c2 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            } else if (c1 > 239 && c1 < 365) {
                // Surrogate Pair
                let c2 = bytes[pos++];
                let c3 = bytes[pos++];
                let c4 = bytes[pos++];
                let u =
                    (((c1 & 7) << 18) |
                        ((c2 & 63) << 12) |
                        ((c3 & 63) << 6) |
                        (c4 & 63)) -
                    0x10000;
                out[c++] = String.fromCharCode(0xd800 + (u >> 10));
                out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
            } else {
                let c2 = bytes[pos++];
                let c3 = bytes[pos++];
                out[c++] = String.fromCharCode(
                    ((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63)
                );
            }
        }
        return out.join("");
    }
    
    return {
        On, 
        Emmit
    }
}