define(["/jquery.js"], function() {

    var self;

    var throbber = null,
        error = null,
        backLink = null,
        navTitle = null,
        modules = null,
        versions = null,
        userForm = null,
        navigate = null;

    var all = null;

    function init(config) {

        self = this;

        // TODO application scripts
        //$("#providers", self.dom).button();

        throbber = $("#throbber", self.dom);
        error = $("#errorMessage", self.dom);
        backLink = $("#backLink", self.dom);
        navTitle = $("#navTitle", self.dom);
        modules = $("#modules", self.dom);
        versions = $("#versions", self.dom);
        userForm = $("#userSearch", self.dom);
        navigate = $("#navigate", self.dom);

        all = $(".gdcomp", self.dom);

        $(window).bind('hashchange', processHash);

        $("#userSearch", this.dom).submit(function() {
            var user = $("#ghuser").val().trim();
            if (!user) {
                return false;
            }
            window.location.hash = user;
            return false;
        });

        $("#modules", self.dom).on("click", ".module", function() {
            navigateHash(1, $(this).text());
            return false;
        });

        $("#versions", self.dom).on("click", ".download", versionAction);
        $("#versions", self.dom).on("click", ".remove", versionAction);

        $("#errorMessage", self.dom).on("click", "button", function() {
            error.fadeOut();
        });

        $(self.dom).on("click", "#refresh", function() {
            processHash();
            return false;
        });


        processHash();
    }

    function versionAction() {
        var link = $(this);
        link.hide();
        link.after("<img src='throbber.sml.gif'/>")
    
        var sha = this.sha;
        var action = link.attr("class");

        var options = {
            data: {
                sha: sha,
                source: "github",
                repo: navTitle.text(),
                user: backLink.find("span").text()
            },
            path: action
        };

        self.link("modules", options, function(err, data) {
            var newAction = err ? action : (data.local ? "remove" : "download" );
            var icon = "<i class='icon-" + newAction + "'></i>"
            link.attr("class", newAction);
            link.next().remove();
            link.html(icon);
            link.show();

            if (err) {
                showError(err);
                return;
            }
        });

        return false;
    }

    function navigateHash(position, value) {
        var hash = window.location.hash.substr(1);
        var splits = hash.split("/");
        if (splits.length < position) {
            return;
        }
        splits[position] = value;
        hash = "#";
        for (var i = 0; i <= position; i++) {
            hash += splits[i] + "/";
        }
        window.location.hash = hash.slice(0, -1);
    }


    function processHash() {
        var hash = window.location.hash.substr(1);
        if (hash === "") {
            showForm();
            return;
        }
        var splits = hash.split("/");
        switch (splits.length) {
            case 1:
                wait("modules", { user: splits[0] }, showModules);
                break;
            case 2:
                wait("versions", { source: "github", user: splits[0], module: splits[1] }, showVersions);
                break;
        }

        return false;
    };


    function wait(action, data, callback) {
        all.hide();
        throbber.show();

        var options = {
            data: data,
            path: action
        };

        self.link("modules", options, function(err, data) {
            if (err) {
                return showError(err);
            }
            callback(data);
        });
    }

    function showError(message) {
        error.find("span").text(message);
        error.fadeIn();
    }

    function showForm() {
        all.hide();
        userForm.show();
    }

    function showModules(data) {
        all.hide();
        populateData(modules, data);
        showNavigator();
        modules.show();
    }

    function showVersions(data) {
        all.hide();
        populateData(versions, data);
        showNavigator();
        versions.show();
    }

    function showNavigator() {
        var hash = window.location.hash;
        if (hash.substr(-1) === "/") {
            hash.slice(0, -1);
        }

        var index = hash.lastIndexOf("/");
        if (index > 0) {
            navTitle.text(hash.substr(index + 1));
            backLink.find("span").text(hash.substr(1, index - 1));
            backLink.attr("href", hash.slice(0, index));
        } else {
            navTitle.text(hash.substr(index + 2));
            backLink.find("span").text("user search");
            backLink.attr("href", "#");
        }
        navigate.show();
    }

    var handleVersion = function(version) {
        var elem = $(this);

        // the GitHub link
        elem.find(".external").attr("href", version.commit.url.replace("api.github.com/repos", "github.com").replace("git/commits", "tree"));

        // the version name
        elem.find(".sha").text(version.sha);
        elem.find(".sha").attr("title", version.commit.message);

        // remove/download icon
        var drLink = elem.find(".download");
        drLink[0].sha = version.sha;
        drLink.find("i").addClass(version.local ? "icon-remove" : "icon-download").attr("title", version.local ? "Remove local version" : "Bring version local");

        if (version.local) {
            drLink.attr("class", "remove");
        }
    };

    function populateData(target, data) {
        var template = target.find(".template");
        if (!template) {
            return;
        }
        template.nextAll().each(function() {
            $(this).remove();
        });

        var handler = template.attr("data-handler");

        for (var i in data) {
            // clone the template
            var instance = template.clone();

            if (handler) {
                eval(handler).call(instance, (data[i]));
            } else {
                instance.find("[data-field]").each(function() {
                    var elem = $(this);
                    var value = data[i][elem.attr("data-field")];

                    var handler = elem.attr("data-handler");
                    if (handler) {
                        return;
                    }

                    var attrTarget = elem.attr("data-target");
                    if (attrTarget) {
                        elem.attr(attrTarget, value);
                        return;
                    }

                    elem.text(value);
                });
            }

            instance.removeClass("template");
            template.parent().append(instance);
        }
    }
    return init;
});

