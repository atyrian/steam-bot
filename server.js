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
var friendsArray = [];
var msg;

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

var addPendingFriendRequests = () => {
    for (var i = 0; i < friendsArray.length; i++) {
        var obj = friendsArray[i];
        for (var key in obj) {
            var steamID = key;
            var EFriendRelationshipStatus = obj[key];
            if (EFriendRelationshipStatus == '2') {
                steamFriends.addFriend(steamID);
                steamFriends.sendMessage(steamID, 'Hi, I am a bot. Start CS:GO and I will collect your rank.', Steam.EChatEntryType.ChatMsg);
            }
        }
    }
};

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

    steamFriends.setPersonaState(Steam.EPersonaState.Online);
    steamFriends.setPersonaName('BOT v1.0');
    friendsArray.push(steamFriends.friends);
    console.log("Logged on.");
    console.log("Current SteamID64: " + steamClient.steamID);
    console.log("Account ID: " + CSGO.ToAccountID(steamClient.steamID));
    CSGO.launch();

    CSGO.on('ready', () => {
        console.log("node-csgo ready.");


        CSGO.on("playerProfile", (profile) => {
            console.log(profile);
            if (profile.account_profiles[0]) {
                var source = CSGO.ToSteamID(profile.account_profiles[0].account_id);
                msg = ("Your Rank is currently: " + CSGO.Rank.getString(profile.account_profiles[0].ranking.rank_id) + ". If this is not your current rank, try launching CS:GO again.");
                steamFriends.sendMessage(source, msg, Steam.EChatEntryType.ChatMsg);
            } else {
                console.log('The response object was empty, try again');
            }
        });

        steamFriends.on('personaState', (data) => {
            console.log('PersonaState change in friendslist:');
            var friend = {
                steamID: data.friendid,
                gameid: data.gameid
            };
            if (data.steamID != steamClient.steamID && data.gameid == 730) {
                console.log(friend.steamID, ' is playing CS:GO');
                setTimeout(function () {
                    CSGO.playerProfileRequest(CSGO.ToAccountID(friend.steamID));
                }, 1);

            }
        });

        steamFriends.on('friendMsg', function (source, message, type) {
            console.log('Received message: ' + message);

            if (message !== "") {
                msg = 'Hi! I am a BOT written by @Kryddan. My purpose is to scan for your CS:GO rank and persist it to a database. If you wish to register your rank, simply log into CS:GO and I will send you a message containing the rank I have stored for your profile. After you receive my message, you can safely remove me from your friend list. Should you wish to update me with your new rank, just add me again and I will update the database.';

                steamFriends.sendMessage(source, msg, Steam.EChatEntryType.ChatMsg);
            } else {
                console.log('Empty Message');
            }

        });

        steamFriends.on('friend', (steamID, EFriendRelationship) => {
            if (EFriendRelationship == 2) {
                console.log('Received friendrequest from: ', steamID);
                steamFriends.addFriend(steamID);
                console.log('Added friend: ', steamID);
                steamFriends.sendMessage(steamID, 'Hi, I am a bot. Start CS:GO and I will collect your rank.', Steam.EChatEntryType.ChatMsg);
            }
        });

        steamFriends.on('relationships', () => {
            console.log('This is the friends property: ', steamFriends.friends);
        });

        addPendingFriendRequests();
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
