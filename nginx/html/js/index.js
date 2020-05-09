var Algorithms;
(function (Algorithms) {
    Algorithms[Algorithms["sha1"] = 0] = "sha1";
    Algorithms[Algorithms["sha256"] = 1] = "sha256";
    Algorithms[Algorithms["sha512"] = 2] = "sha512";
})(Algorithms || (Algorithms = {}));
class AlgorithmsMaper {
    static add(algo, uriParam, jsSha) {
        this.ToJsSha.set(algo, jsSha.toUpperCase());
        this.FromUriParameter.set(uriParam.toUpperCase(), algo);
    }
    static getJsFromAlog(algo) {
        return this.ToJsSha.get(algo);
    }
    static getAlgoFromUri(uri) {
        return this.FromUriParameter.get(uri.toUpperCase());
    }
}
AlgorithmsMaper.ToJsSha = new Map();
AlgorithmsMaper.FromUriParameter = new Map();
AlgorithmsMaper.add(Algorithms.sha1, "SHA1", "SHA-1");
AlgorithmsMaper.add(Algorithms.sha256, "SHA256", "SHA-256");
AlgorithmsMaper.add(Algorithms.sha512, "SHA512", "SHA-512");
class TOTP {
    constructor(_url) {
        this.url = _url;
        var urlObj = new URL(this.url);
        if (urlObj.protocol !== 'otpauth:') {
            throw "protocol mismatch";
        }
        if (!urlObj.pathname.startsWith('//totp/')) {
            throw 'has to be totp';
        }
        var index = urlObj.pathname.indexOf(':');
        this.issuer = decodeURI(urlObj.pathname.substring(7, index));
        this.label = decodeURI(urlObj.pathname.substring(index + 1));
        var secret = urlObj.searchParams.get('secret');
        if (secret === null) {
            throw "secret is missing";
        }
        this.key = this.base32tohex(secret);
        this.issuer = urlObj.searchParams.get('issuer') || this.issuer;
        this.algo = AlgorithmsMaper.getAlgoFromUri(urlObj.searchParams.get('algorithm') || "") || Algorithms.sha1;
        this.period = +urlObj.searchParams.get('period') || 30;
        TOTP.totps.push(this);
    }
    static saveAllTotps() {
        var items = new Array();
        for (var i = 0; i < TOTP.totps.length; i++) {
            items.push(TOTP.totps[i].url);
        }
        window.localStorage.setItem('totps', JSON.stringify(items));
    }
    static loadAllTotpsAndDisplay() {
        var item = window.localStorage.getItem('totps');
        if (item) {
            var res = JSON.parse(item);
            for (var i = 0; i < res.length; i++) {
                new TokenRenderer(new TOTP(res[i])).continuesUpdate();
            }
        }
    }
    dec2hex(s) { return (s < 15.5 ? '0' : '') + Math.round(s).toString(16); }
    hex2dec(s) { return parseInt(s, 16); }
    leftpad(str, len, pad) {
        if (len + 1 >= str.length) {
            str = Array(len + 1 - str.length).join(pad) + str;
        }
        return str;
    }
    base32tohex(base32) {
        var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var bits = "";
        var hex = "";
        for (var i = 0; i < base32.length; i++) {
            var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
            bits += this.leftpad(val.toString(2), 5, '0');
        }
        for (var i = 0; i + 4 <= bits.length; i += 4) {
            var chunk = bits.substr(i, 4);
            hex = hex + parseInt(chunk, 2).toString(16);
        }
        return hex;
    }
    getTimeNumber() {
        return Math.floor(Math.round(new Date().getTime() / 1000.0) / this.period);
    }
    getTimeTillNext() {
        return new Date().getTime() % (this.period * 1000);
    }
    getToken() {
        var time = this.leftpad(this.dec2hex(this.getTimeNumber()), 16, '0');
        var shaObj = new jsSHA(AlgorithmsMaper.getJsFromAlog(this.algo), "HEX");
        shaObj.setHMACKey(this.key, "HEX");
        shaObj.update(time);
        var hmac = shaObj.getHMAC("HEX");
        var offset = this.hex2dec(hmac.substring(hmac.length - 1));
        var otp = (this.hex2dec(hmac.substr(offset * 2, 8)) & this.hex2dec('7fffffff')) + '';
        return (otp).substr(otp.length - 6, 6);
    }
    getQRCode() {
        var src = this.getQrUrl();
        var elm = document.createElement('img');
        elm.src = src;
        return elm;
    }
    getQrUrl() {
        return 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=200x200&chld=M|0&cht=qr&chl=' + this.url;
    }
    getDisplayLabel() {
        if (this.issuer) {
            return this.issuer + " (" + this.label + ")";
        }
        else {
            return this.label;
        }
    }
}
TOTP.totps = new Array();
class TokenRenderer {
    constructor(_totp) {
        this.totp = _totp;
        var div = document.createElement('div');
        div.classList.add('topt');
        div.classList.add('clicky');
        let x = this;
        div.addEventListener('click', function (e) {
            var token = x.totp.getToken();
            console.log(token);
            navigator.clipboard.writeText(token);
        });
        let t = this;
        div.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.open(t.totp.getQrUrl());
        });
        this.number = document.createElement('div');
        this.number.classList.add('totp-numbers');
        this.label = document.createElement('div');
        this.label.classList.add('totp-label');
        this.label.innerHTML = this.totp.getDisplayLabel();
        div.appendChild(this.number);
        div.appendChild(this.label);
        document.getElementById('totp-wrapper').appendChild(div);
    }
    setLabels() {
        var t = this.totp.getToken();
        this.number.innerHTML = t.substr(0, 3) + " " + t.substr(3, 3);
    }
    continuesUpdate() {
        let x = this;
        function _() {
            x.setLabels();
            setTimeout(_, x.totp.getTimeTillNext());
        }
        _();
    }
}
window.onload = function () {
    TOTP.loadAllTotpsAndDisplay();
};
function addBtn() {
    try {
        var inputelm = document.getElementById('url');
        var url = inputelm.value;
        if (url) {
            addUrl(url);
            inputelm.value = "";
        }
    }
    catch (e) {
        alert(e);
    }
}
function addUrl(url) {
    var topt = new TOTP(url);
    new TokenRenderer(topt).continuesUpdate();
    TOTP.saveAllTotps();
}
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/js/service-worker.js', { scope: '/' })
        .then(function (registration) {
    })
        .catch(function (error) {
        alert('Service worker registration failed, error: ' + error);
    });
}
