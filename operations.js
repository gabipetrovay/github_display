var send  = require(CONFIG.root + "/core/send.js").send;
var monoapi = require(CONFIG.root + "/api/server");

var fs = require("fs"),
    path = require('path');

var GitHubApi = require("github"),
    request = require("request");

var github = new GitHubApi({
    version: "3.0.0"
});


exports.modules = function(link) {

    switch (link.path[0]) {

        case "modules":
            getModules(link.data.user, function(err, modules) {
                if (err) {
                    send.internalservererror(link, err);
                }
                send.ok(link.res, modules);
            });
            break;

        case "versions":
            getVersions(link.data.user, link.data.module, function(err, versions) {
                if (err) {
                    send.internalservererror(link, err);
                }
                send.ok(link.res, versions);
            });
            break;

        case "download":
            var user = link.data.user,
                repo = link.data.repo,
                sha = link.data.sha;

            if (!sha || !user || !repo) {
                send.badrequest(link, "user, sha, and repo are mandatory fields");
                return;
            }

            monoapi.installModule(user, repo, sha, function(err, result) {
                if (err) {
                    send.internalservererror(link, err);
                    return;
                }
                send.ok(link.res, { local: true });
            });

            break;

        case "remove":
            var user = link.data.user,
                repo = link.data.repo,
                sha = link.data.sha;

            if (!sha || !user || !repo) {
                send.badrequest(link, "user, sha, and repo are mandatory fields");
            }

            monoapi.uninstallModule(user, repo, sha, function(err, result) {
                if (err) {
                    send.internalservererror(link, err);
                    return;
                }
                send.ok(link.res, { local: false });
            });

            break;

        default:
            send.notfound(link, "Invalid action: " + link.path);
    }
};


function getModules(user, callback) {

    var data = {
        user: user,
        type: "owner"
    };

    github.repos.getFromUser(data, function(err, res) {

        if (err) {
            return callback(err.message || err);
        }

        var modules = [];
        var count = res.length;

        if (!count) {
            return callback(null, []);
        }

        for (var i = 0; i < count; i++) {
            (function (repo) {
                request.head("https://raw.github.com/" + data.user + "/" + res[i].name + "/master/mono.json", function(err, response) {
                    if (!err && response.statusCode == 200) {
                        modules.push(repo);
                    }
                    count--;
                    if (!count) {
                        callback(null, modules)
                    }
                }); 
            })(res[i]);
        }
    });
}


function getVersions(source, user, module, callback) {

    var data = {
        user: user,
        repo: module
    };

    github.repos.getCommits(data, function(err, res) {
        if (err) {
            send.internalservererror(link, err.message);
            return;
        }

        for (var i = 0; i < res.length; i++) {
            if (path.existsSync(CONFIG.root + "/modules/" + source + "/" + user + "/" + module + "/" + res[i].sha)) {
                res[i].local = true;
            }
        }

        callback(null, res);
    });
}

