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

    steamFriends.setPersonaState(Steam.EPersonaState.Offline);
    steamFriends.setPersonaName('BOT v1.0');
    console.log("Logged on.");
    console.log("Current SteamID64: " + steamClient.steamID);
    console.log("Account ID: " + CSGO.ToAccountID(steamClient.steamID));
    CSGO.launch();

    CSGO.on('ready', () => {
        console.log("node-csgo ready.");

        CSGO.playerProfileRequest(CSGO.ToAccountID(steamClient.steamID));
        CSGO.on("playerProfile", (profile) => {
            console.log("Profile");
            console.log("Player Rank: " + CSGO.Rank.getString(profile.account_profiles[0].ranking.rank_id))
            console.log(JSON.stringify(profile, null, 2));
        });

        steamFriends.on('message', function (source, message, type, chatter) {
            console.log('Received message: ' + message);
            if (message == 'ping') {
                steamFriends.sendMessage(source, 'pong',
                    Steam.EChatEntryType.ChatMsg);
            } else if (message !== "") {
                steamFriends.sendMessage(source, 'Invalid Command');
            }
        });
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
