var send  = require(CONFIG.root + "/core/send.js").send;

var fs = require("fs"),
    path = require('path');
    cp = require('child_process');

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

            fetchVersion(user, repo, sha, function(err, result) {
                if (err) {
                    send.internalservererror(link, err);
                    return;
                }

                send.ok(link.res, result);
            });

            break;

        case "remove":
            var user = link.data.user,
                repo = link.data.repo,
                sha = link.data.sha;

            if (!sha || !user || !repo) {
                send.badrequest(link, "user, sha, and repo are mandatory fields");
            }

            removeVersion(user, repo, sha, function(err, result) {
                if (err) {
                    send.internalservererror(link, err);
                    return;
                }

                send.ok(link.res, result);
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


function getVersions(user, module, callback) {

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
            if (path.existsSync(CONFIG.root + "/modules/" + user + "/" + module + "/" + res[i].sha)) {
                res[i].local = true;
            }
        }

        callback(null, res);
    });
}

function fetchVersion(user, module, version, callback) {

    // clone the repo first
    var options = {
        cwd: CONFIG.root + "/modules/" + user + "/" + module
    };
    var git = cp.spawn("git", ["clone", "https://github.com/" + user + "/" + module + ".git", version], options);

    git.on("exit", function(code) {
        if (code) {
            return callback(link, "git clone exited with code: " + code);
        }

        // reset to this commit
        options.cwd = options.cwd + "/" + version;
        var revert = cp.spawn("git", ["reset", "--hard", version], options);

        revert.on("exit", function(code) {
            if (code) {
                return callback("git reset failed with code: " + code);
            }

            callback(null, { local: true });
        });
    });
}

function removeVersion(user, module, version, callback) {

    var options = {
        cwd: CONFIG.root + "/modules/" + user + "/" + module + "/"
    };
    var git = cp.spawn("rm", ["-Rf", version], options);

    git.on("exit", function(code) {
        if (code) {
            send.internalservererror(link, "could not remove version: " + code);
            return;
        }
        send.ok(link.res, { local: false });
    });
}

