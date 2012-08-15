define(function() {

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

    var source = "github";

    function init(config) {

        self = this;

        $("#providers", self.dom).button();
        $("#providers", self.dom).on("click", ".btn", function() {
            if (!$(this).hasClass("active")) {
                var text = $(this).text();
                source = text.toLowerCase();
                $("#ghuser").attr("placeholder", text + " User");
            }
        });

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
            window.location.hash = source + "/" + user;
            return false;
        });

        $("#modules", self.dom).on("click", ".module", function() {
            navigateHash(2, $(this).text());
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
    
        var version = this.version_name;
        var action = link.attr("class");

        var options = {
            data: {
                source: source,
                owner: backLink.find("span").text(),
                repo: navTitle.text(),
                version: version
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
        hash = "";
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
        // remove trailing slash
        if (hash.substr(-1) === "/") {
            window.location.hash = hash.slice(0, -1);
            return;
        }
        var splits = hash.split("/");
        source = splits[0];
        switch (splits.length) {
            case 1:
                window.location.hash = "";
                break;
            case 2:
                wait("modules", { source: splits[0], owner: splits[1] }, showModules);
                break;
            case 3:
                wait("versions", { source: splits[0], owner: splits[1], module: splits[2] }, showVersions);
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

        var splits = hash.split("/");
        var len = splits.length;
        switch (len) {
            case 1:
                return;
            case 2:
                navTitle.text(splits[1]);
                backLink.find("span").text("user search");
                backLink.attr("href", "#");
                break;
            case 3:
                navTitle.text(splits[2]);
                backLink.find("span").text(splits[1]);
                backLink.attr("href", splits[0] + "/" + splits[1]);
                break;
            case 4:
                window.location.hash = "";
                return;
        }
        navigate.show();
    }

    var handleLocal = function(version) {
        var elem = $(this);

        // remove/download icon
        var drLink = elem.find(".download");
        drLink[0].version_name = version.name;
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
                eval(handler).call(instance, data[i]);
            } else {
                instance.find("[data-field]").each(function() {
                    var elem = $(this);

                    var value = data[i][elem.attr("data-field")];

                    var attrTarget = elem.attr("data-target");
                    if (attrTarget) {
                        elem.attr(attrTarget, value);
                    } else {
                        elem.text(value);
                    }
                });
                instance.find("[data-handler]").each(function() {
                    var elem = $(this);
                    var itemHandler = elem.attr("data-handler");
                    eval(itemHandler).call(elem, data[i]);
                });
            }

            instance.removeClass("template");
            template.parent().append(instance);
        }
    }
    return init;
});

