class CryptoProvider {
    constructor() {
    }
    static async createKeyPair() {
        return window.crypto.subtle.generateKey({
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: {
                name: "SHA-512"
            },
        }, true, CryptoProvider.keyCapabilities);
    }
    static uuidv4() {
        return ('10000000-1000-4000-8000-100000000000').replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    }
}
CryptoProvider.keyCapabilities = ["encrypt", "decrypt"];
CryptoProvider.ImportParams = {
    name: "RSA-OAEP",
    hash: { name: "SHA-512" }
};
class LocalStorageHelper {
    constructor(_identiy) {
        this.identiy = _identiy;
    }
    static async getIdentities() {
        var idents = window.localStorage.getItem("identities");
        if (idents === null) {
            var identity = await Identity.createIdenty("Default");
            await LocalStorageHelper.addIdentity(identity);
            return this.getIdentities();
        }
        else {
            var res = JSON.parse(idents);
            var rtn = new Array();
            for (var i = 0; i < res.length; i++) {
                rtn.push(await Identity.import(res[i]));
            }
            return rtn;
        }
    }
    static async addIdentity(identity) {
        var test = window.localStorage.getItem("identities");
        var idents = [];
        if (test == null) {
            idents = [identity];
        }
        else {
            idents = await LocalStorageHelper.getIdentities();
            idents.push(identity);
        }
        var enc = [];
        for (var i = 0; i < idents.length; i++) {
            enc.push(await idents[i].export());
        }
        window.localStorage.setItem("identities", JSON.stringify(enc));
    }
    GetAssociatedSecrets() {
        var item = window.localStorage.getItem(this.identiy.uid);
        if (item === null) {
            return [];
        }
        else {
            var parsed = JSON.parse(item);
            var converted = new Array();
            for (var i = 0; i < parsed.length; i++) {
                converted.push(Secret.fromObject(parsed[i]));
            }
            return converted;
        }
    }
    AddSecret(secret) {
        var secrets = this.GetAssociatedSecrets();
        secrets.push(secret);
        window.localStorage.setItem(this.identiy.uid, JSON.stringify(secrets));
    }
}
class Identity {
    constructor(_identifier, _keypair, _uuid) {
        this.identifier = _identifier;
        this.privateKey = _keypair.privateKey;
        this.publicKey = _keypair.publicKey;
        this.uid = _uuid;
    }
    static async createIdenty(name) {
        return CryptoProvider.createKeyPair().then(function (keypair) {
            return new Identity(name, keypair, CryptoProvider.uuidv4());
        });
    }
    static async import(data) {
        var pub = await crypto.subtle.importKey('jwk', data.public, CryptoProvider.ImportParams, true, ['encrypt']);
        var pri = await crypto.subtle.importKey('jwk', data.private, CryptoProvider.ImportParams, true, ['decrypt']);
        return new Identity(data.identifier, { privateKey: pri, publicKey: pub }, data.uid);
    }
    async export() {
        var pri = await crypto.subtle.exportKey('jwk', this.privateKey);
        var pub = await crypto.subtle.exportKey('jwk', this.publicKey);
        return {
            "identifier": this.identifier,
            "public": pub,
            "private": pri,
            "uid": this.uid
        };
    }
}
class Secret {
    constructor(_data, _udi) {
        this.data = _data;
        this.uid = _udi ? _udi : CryptoProvider.uuidv4();
    }
    static fromObject(obj) {
        return new Secret(obj.data, obj.uid);
    }
}
var q = async function () {
    var s = new Secret("test");
    var lsh = new LocalStorageHelper((await LocalStorageHelper.getIdentities())[0]);
    console.log(lsh.GetAssociatedSecrets());
};
q();
