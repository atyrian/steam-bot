var bodyParser = require('body-parser');
var express = require('express');
var path = require('path');
var readline = require('readline');
var Steam = require('steam');
var steamTotp = require('steam-totp');
var SteamUser = require('steam-user');
var csgo = require('csgo');

var app = express();
var DEFAULT_PORT = 1337;
var port = '';
var details = {};

if (!process.env.port) {
    var credentials = require('./secrets.json');
    details = {
        "accountName": credentials.steamAccount.account_name,
        "password": credentials.steamAccount.password
    };
    port = DEFAULT_PORT;

} else {
    port = process.env.port;
    details = {
        "accountName": process.env.account_name,
        "password": process.env.password
    };
}

var steamClient = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(steamClient);
var steamFriends = new Steam.SteamFriends(steamClient);
var steamGC = new Steam.SteamGameCoordinator(steamClient, 730);
var CSGO = new csgo.CSGOClient(steamUser, steamGC, false);
var msg;

steamClient.connect();
steamClient.on('connected', () => {
    steamUser.logOn({
        account_name: details.accountName,
        password: details.password
    });
});
steamClient.on('logOnResponse', (logonResp) => {
    if (logonResp.eresult == 1) {
        console.log('BOT Online');
    } else {
        console.log(logonResp.eresult);
    }

    steamFriends.setPersonaState(Steam.EPersonaState.Online);
    steamFriends.setPersonaName('BOT v1.0');
    console.log("Logged on.");
    console.log("Current SteamID64: " + steamClient.steamID);
    console.log("Account ID: " + CSGO.ToAccountID(steamClient.steamID));
    CSGO.launch();
    var i = 0;

    CSGO.on('ready', () => {
        console.log("node-csgo ready.");

        steamFriends.on('friendMsg', function (source, message, type) {
            console.log('Received message: ' + message);
            if (message !== "") {
                CSGO.playerProfileRequest(CSGO.ToAccountID(source));
                CSGO.on("playerProfile", (profile) => {
                    if (profile.account_profiles[0]) {
                        msg = ("Your Rank is currently: " + CSGO.Rank.getString(profile.account_profiles[0].ranking.rank_id) + ". If this is not your current rank, prompt me again");
                        steamFriends.sendMessage(source, msg, Steam.EChatEntryType.ChatMsg);
                    } else {
                        steamFriends.sendMessage(source, 'Please log into CS:GO and prompt me for your rank', Steam.EChatEntryType.ChatMsg);
                        console.log('DEBUGG I HAVE BEEN HIT', i++);
                    }

                });
            } else {
                console.log('Empty Message');
            }
            switch (source) {
                case '76561198018608481':
                    steamFriends.sendMessage(source, 'Invalid operation: Hurley detected', Steam.EChatEntryType.ChatMsg);
                    break;

                case '76561198008736843':
                    steamFriends.sendMessage(source, 'Invalid operation: Bögwille detected', Steam.EChatEntryType.ChatMsg);
                    break;

                default:
                    break;
            }
        });
    });

    CSGO.on("unready", function onUnready() {
        console.log("node-csgo unready.");
    });

    CSGO.on("unhandled", function (kMsg) {
        console.log("UNHANDLED MESSAGE " + kMsg);
    });

});
steamClient.on('error', (error) => {
    console.log('Error', error);
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './public')));

app.listen(port, () => {
    console.log('Server listening on port: ', port);
});
