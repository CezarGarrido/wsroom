function WsRoom(url) {
    let state = {
        Socket: null,
        observers: {},
    }

    state.Socket = new WebSocket(url);

    state.Socket.onopen = function(event) {
        console.log("[CONECTED]", event.data);
    };

    state.Socket.onmessage = function(event) {
        let msg = JSON.parse(event.data);
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
        setTimeout(function() { retry() }, 5000);
    };

    function retry() {
        state.Socket = new WebSocket(url);
    }

    function notifyAll(type, payload) {
        Object.keys(state.observers).forEach(function(key) {
            if (type == key) {
                state.observers[key](payload)
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

    function buscaProcesso(escritorioID, userID, autos) {
        let processoBuscaAssincrona = {
            numero_processo: autos,
            escritorio_id: parseInt(escritorioID),
            user_id: parseInt(userID)
        }
        Emit("post:processo", processoBuscaAssincrona);
    }
    return {
        On,
        Emit,
        buscaProcesso
    }
}

function abrirProcesso(id) {
    window.open('processoficha.asp?Cod=' + id, '_blank');
}

function onProcessoReceived(payLoad) {
    let result = payLoad;
    let now = new Date();
    let tipo = '';
    let msg = '';
    let botao = '';
    let lb_status = '';

    if (result.status == 'SUCESSO') {
        tipo = 'success';
        msg = 'Processo cadastrado com sucesso!';
        botao = '<a href="processoficha.asp?Cod=' + result.projud_processo_id + '" class="btn-success btn" target="blank"><i class="fa fa-search"></i> Visualizar Processo</a>';
        lb_status = '<span class="label label-success"><i class="fa fa-check"></i> Sucesso</span>';
    } else if (result.status == 'ERROR') {
        tipo = 'error';
        msg = 'Ops! Não foi possível realizar esta ação.\n' + result.error_message;
        botao = '';
        lb_status = '<span class="label label-danger">Erro</span>';
    } else {
        tipo = 'info';
        msg = 'Estamos cadastrando o processo. Isso pode levar alguns minutos!';
        botao = now;
        lb_status = '<span class="label label-warning"><i class="fa fa-spinner fa-spin"></i> Buscando...</span>';
    }
    //type: "notice" - Type of the notice. "notice", "info", "success", or "error".
    $.pnotify({
        title: 'Cadastro de Processo',
        text: msg,
        type: tipo,
        history: false
    }).click(function(e) {
        if (result.status == 'SUCESSO') {
            abrirProcesso(result.projud_processo_id);
        }
        return;

    });

    if ($('#cad_' + result.id).length > 0) {
        var $messageLine = $(
            '<td><h3>' + result.numero_processo + '</h3></td>' +
            '<td>' + lb_status + '</td><td class="hidden-xs hidden-md">' + botao + '</td>');
        $('#cad_' + result.id).html($messageLine);
    } else {
        var $messageLine = $(
            '<tr id="cad_' + result.id + '"><td><h3>' + result.numero_processo + '</h3></td>' +
            '<td>' + lb_status + '</td><td>' + now + '</td></tr>');
        $chatWindow.append($messageLine);
    }

}

var url = "wss://apicadastro.projud.com.br/ws";
var $message;
var $chatWindow;

var roomUrl = url + '/' + userID;

var ProjudWs = new WsRoom(roomUrl);

ProjudWs.On("post:processo", onProcessoReceived);
ProjudWs.On("result:processo", onProcessoReceived);
ProjudWs.On("server:error", onProcessoReceived);
