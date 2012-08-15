var send  = require(CONFIG.root + "/core/send.js").send;
var monoapi = require(CONFIG.root + "/api/server");
var repos = require(CONFIG.root + "/api/repos");

var fs = require("fs");


exports.modules = function(link) {

    switch (link.path[0]) {

        case "modules":
            repos.getModules(link.data.source, link.data.owner, function(err, modules) {
                if (err) {
                    send.internalservererror(link, err);
                }
                send.ok(link.res, modules);
            });
            break;

        case "versions":
            repos.getVersions(link.data.source, link.data.owner, link.data.module, function(err, versions) {
                if (err) {
                    send.internalservererror(link, err);
                }
                send.ok(link.res, versions);
            });
            break;

        case "download":
            var source = link.data.source,
                owner = link.data.owner,
                repo = link.data.repo,
                version = link.data.version;

            if (!source || !version || !owner || !repo) {
                send.badrequest(link, "source, owner, version, and repo are mandatory fields");
                return;
            }

            var module = new monoapi.Module(source, owner, repo, version);
            monoapi.installModule(module, function(err, result) {
                if (err) {
                    send.internalservererror(link, err);
                    return;
                }
                send.ok(link.res, { local: true });
            });

            break;

        case "remove":
            var source = link.data.source,
                owner = link.data.owner,
                repo = link.data.repo,
                version = link.data.version;

            if (!source || !version || !owner || !repo) {
                send.badrequest(link, "source, owner, version, and repo are mandatory fields");
            }

            var module = new monoapi.Module(source, owner, repo, version);
            monoapi.uninstallModule(module, function(err, result) {
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

