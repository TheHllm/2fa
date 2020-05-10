enum Algorithms{
    sha1,
    sha256,
    sha512
}
class AlgorithmsMaper{
    private static ToJsSha: Map<Algorithms, string> = new Map<Algorithms, string>();
    private static FromUriParameter: Map<string, Algorithms> = new Map<string, Algorithms>();
    public static add(algo: Algorithms, uriParam: string, jsSha: string){
        this.ToJsSha.set(algo, jsSha.toUpperCase());
        this.FromUriParameter.set(uriParam.toUpperCase(), algo);
    }
    public static getJsFromAlog(algo: Algorithms){
        return this.ToJsSha.get(algo);
    }
    public static getAlgoFromUri(uri: string){
        return this.FromUriParameter.get(uri.toUpperCase());
    }
}
AlgorithmsMaper.add(Algorithms.sha1,   "SHA1",   "SHA-1");
AlgorithmsMaper.add(Algorithms.sha256, "SHA256", "SHA-256");
AlgorithmsMaper.add(Algorithms.sha512, "SHA512", "SHA-512");

//TODO: care about digits (Currently, on Android and Blackberry the digits parameter is ignored by the Google Authenticator implementation.)
class TOTP {
    private static totps: Array<TOTP> = new Array<TOTP>();
    public static saveAllTotps(){
        var items: Array<string> = new Array<string>();
        for(var i = 0; i < TOTP.totps.length; i++){
            items.push(TOTP.totps[i].url);
        }
        window.localStorage.setItem('totps', JSON.stringify(items));
    }
    public static loadAllTotpsAndDisplay(){
        var item = window.localStorage.getItem('totps');
        if(item){
            var res = JSON.parse(item);
            for(var i = 0; i < res.length; i++){
                new TokenRenderer(new TOTP(res[i] as string)).continuesUpdate();
            }
        }
    }
    public static removeTotp(x: TOTP){
        TOTP.totps = TOTP.totps.filter(q => q.url !== x.url);
    }
    public static hashUrl(url:string):boolean{
        return TOTP.totps.some(q => q.url === url);
    }

    public key: string;
    public shaObj: any;
    public currentTime: number;
    public period: number;
    public algo: Algorithms;
    public issuer: string;
    public label: string;
    
    public url: string;

    constructor(_url: string) {
        this.url = _url;
        var urlObj = new URL(this.url);
        //sanety check
        if(urlObj.protocol === 'web+otpauth:'){
            this.url = this.url.substring(4); //chop off the web-
            urlObj = new URL(this.url); //recreate the url obj
        }
        if(urlObj.protocol !== 'otpauth:'){
            throw "protocol mismatch";
        }
        //check that 'type' is totp
        if(!urlObj.pathname.startsWith('//totp/')){
            throw 'has to be totp';
        }
        //set issuer
        var index = urlObj.pathname.indexOf(':');
        this.issuer = decodeURI(urlObj.pathname.substring(7, index));
        //set label
        this.label = decodeURI(urlObj.pathname.substring(index + 1 ));
        //set secret
        var secret = urlObj.searchParams.get('secret');
        if(secret === null){
            throw "secret is missing";
        }
        //debugger;
        this.key = this.base32tohex(secret);
        this.issuer = urlObj.searchParams.get('issuer') || this.issuer;
        this.algo = AlgorithmsMaper.getAlgoFromUri(urlObj.searchParams.get('algorithm') || "") || Algorithms.sha1;
        this.period = +urlObj.searchParams.get('period') || 30; 

        TOTP.totps.push(this);
    }

    dec2hex(s: number) { return (s < 15.5 ? '0' : '') + Math.round(s).toString(16); }
    hex2dec(s: string) { return parseInt(s, 16); }

    leftpad(str: string, len: number, pad:string) {
        if (len + 1 >= str.length) {
            str = Array(len + 1 - str.length).join(pad) + str;
        }
        return str;
    }

    base32tohex(base32: string) {
        var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var bits = "";
        var hex = "";
    
        for (var i = 0; i < base32.length; i++) {
            var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
            bits += this.leftpad(val.toString(2), 5, '0');
        }
    
        for (var i = 0; i+4 <= bits.length; i+=4) {
            var chunk = bits.substr(i, 4);
            hex = hex + parseInt(chunk, 2).toString(16) ;
        }
        return hex;
    }

    getTimeNumber(){
        return Math.floor(Math.round(new Date().getTime() / 1000.0) / this.period);
    }
    getTimeTillNext(){
        return new Date().getTime() % (this.period * 1000);
    }

    getToken(){
        //get time
        var time = this.leftpad(this.dec2hex(this.getTimeNumber()), 16, '0');
        //set sha
        var shaObj = new jsSHA(AlgorithmsMaper.getJsFromAlog(this.algo), "HEX");
        var hex = this.key;
        console.log(hex.length);
        if(hex.length ==65){
            debugger;
        }
        hex = hex.substring(0, hex.length - (hex.length % 2));
        //console.log(hex);
        shaObj.setHMACKey(this.key, "HEX");
        shaObj.update(time);
        var hmac = shaObj.getHMAC("HEX");

        //set offsets
        var offset = this.hex2dec(hmac.substring(hmac.length - 1));

        var otp = (this.hex2dec(hmac.substr(offset * 2, 8)) & this.hex2dec('7fffffff')) + '';
        return (otp).substr(otp.length - 6, 6);
    }

    public getQRCode():HTMLElement{
        var src = this.getQrUrl();
        var elm = document.createElement('img');
        elm.src = src;
        return elm;
    }

    private static makeQrUrl(url){
        var qr = eval("qrcode(0, 'H')");
        qr.addData(url);
        qr.make();
        return qr.createBlobUrl(5,5);
    }

    public getWebQrUrl():string{
        return TOTP.makeQrUrl("web+" + this.url);
    }

    public getQrUrl():string{
        return TOTP.makeQrUrl(this.url);
    }

    public getDisplayLabel():string{
        if(this.issuer){
            return this.issuer + " (" + this.label + ")";
        }else{
            return this.label;
        }
    }
}

class TokenRenderer{
    private totp: TOTP;
    private label: Element;
    private number: Element;

    public constructor(_totp: TOTP){
        this.totp = _totp;
        //elms
        var div = document.createElement('div');
        div.classList.add('topt');
        div.classList.add('clicky');
        let x = this;
        div.addEventListener('click', function (e){
            var token = x.totp.getToken();
            console.log(token);
            navigator.clipboard.writeText(token);
        });
        let t = this;


        this.number = document.createElement('div');
        this.number.classList.add('totp-numbers');
        this.label = document.createElement('div');
        this.label.classList.add('totp-label');
        this.label.innerHTML = this.totp.getDisplayLabel();
        //delete
        var trash = document.createElement('img');
        trash.classList.add('icon');
        trash.src = "/assets/images/svg/trashcan.svg";
        trash.addEventListener('click', function (e){
            e.stopPropagation();
            if(window.confirm('Do you want to delete ' + t.totp.getDisplayLabel() + "?")){
                debugger;
                TOTP.removeTotp(t.totp);
                TOTP.saveAllTotps();
                location.reload();
            }
        });

        //exports
        var ex = document.createElement('img');
        ex.classList.add('icon');
        ex.src = "/assets/images/svg/link-external.svg";
        ex.addEventListener('click', function (e){
            e.stopPropagation();
            window.open(t.totp.getQrUrl(), '_self');
        });
        var ex2 = document.createElement('img');
        ex2.classList.add('icon');
        ex2.src = "/assets/images/svg/link-external-green.svg";
        ex2.addEventListener('click', function (e){
            e.stopPropagation();
            window.open(t.totp.getWebQrUrl(), '_self');
        });

        
        div.appendChild(trash);
        div.appendChild(ex);
        div.appendChild(ex2);
        div.appendChild(this.number);
        div.appendChild(this.label);
        document.getElementById('totp-wrapper').appendChild(div);
    }

    public setLabels(){
        var t = this.totp.getToken();
        this.number.innerHTML = t.substr(0,3) + " " + t.substr(3,3);
    }

    public continuesUpdate(){
        let x = this;
        function _(){
            x.setLabels();
            setTimeout(_, x.totp.getTimeTillNext());
        }
        _();
    }

}



window.onload = function (){
    TOTP.loadAllTotpsAndDisplay();
}

function addBtn(){
    try{
        var inputelm = (document.getElementById('url') as any);
        var url = inputelm.value;// || "otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example";
        if(url){
            addUrl(url);
            inputelm.value = "";
        }
    }catch(e){
        throw e;
        alert(e);
    }
}
function addUrl(url){
    //try to create a topt
    if(!TOTP.hashUrl(url)){
        var topt = new TOTP(url);
        new TokenRenderer(topt).continuesUpdate();
        TOTP.saveAllTotps();   
    } 
}

class SWVersion{
    public static version: string = '3';
    public static alwaysUpdate: boolean = true;
    public static getVersion():string{
        return window.localStorage.getItem('version') || '0';
    }
    public static needsUpdate():boolean{
        return this.getVersion() !== SWVersion.version || SWVersion.alwaysUpdate;
    }
    public static setVersionToCurrent(){
        window.localStorage.setItem('version', SWVersion.version);
    }
    public static isFirstLoad(){
        var is = window.localStorage.getItem('installed') == null;
        window.localStorage.setItem('installed', 'true');
        return is;
    }
}
if(SWVersion.isFirstLoad()){
    setTimeout( function (){navigator.registerProtocolHandler("web+otpauth", location.origin + "#%s", "otpauth");}, 1000);
}
//mangage web+otpauth
var indexOf = location.href.lastIndexOf('#');
if(indexOf !== -1){
    let toBeAdded = location.href.substring(indexOf);
    setTimeout(function (){addUrl(toBeAdded);}, 1000);
}



//service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/js/service-worker.js', {scope: '/'})
    .then(function(registration) {
        if(SWVersion.needsUpdate()){
            console.log("update");
            registration.update();
            SWVersion.setVersionToCurrent();
        }
    })
    .catch(function(error) {
      alert('Service worker registration failed, error: ' + error);
    });
  }