$(function () {

    Parse.$ = jQuery;

    Parse.initialize("Aqrki1CZlZt8zphC3WV3D692sdA9D9M79l1gkvLt",
        "puojbOL9C0d0mzPb1VZE9Lk8B5TyFFbpMpWX5IFc"
    );

    var topicsCollection,
        topicsView,
        socket;

    var Topic = Parse.Object.extend({
        className: "topic",
        defaults: {
            title: "Enter your Topic",
            state: "toDiscuss"
        }
    });

    var TopicsCollection = Parse.Collection.extend({
        model: Topic
    });

    var TopicsView = Parse.View.extend({
        tagName: "ul",
        className: "connectSortable",

        initialize: function () {
            var self = this;

            this.$el.html("<div id='addButton'></div>");
            $("#toDiscuss .listContainer").append(this.el);

            this.collection.on("change", this.broadcastNewTopic, this);

            var serverBaseUrl = document.domain;
            socket = io.connect(serverBaseUrl);
            socket.on("topicCreated", function (topic) {
                self.insertBroadcastedTopic(topic);
            });

        },

        events: {
            "click #addButton": "insertTopic"
        },

        insertTopic: function () {
            var userName = Parse.User.current().getUsername();
            var topic = new Topic();
            topic.set({"user": userName});
            topicsCollection.add(topic);
            this.render(topic);
        },

        insertBroadcastedTopic: function (receivedTopic) {
            var topic = topicsCollection.get(receivedTopic.objectId);
            if (topic == undefined) {
                var newTopic = new Topic();
                newTopic.set(receivedTopic);
                this.render(newTopic);
            }
            else {
                $(".content").each(function () {
                    if ($(this).text() == topic.attributes.title) {
                        $(this).text(receivedTopic.title);
                    }
                });
            }
        },

        loadTopics: function (userName) {
            var query = new Parse.Query("topic");
            query.equalTo("user", userName);
            query.find({success: function (results) {
                for (var i = 0; i < results.length; i++) {
                    topicsCollection.add(results[i]);
                    var topicView = new TopicView({model: results[i]});
                    topicView.$el.hide();
                    var state = topicView.model.get("state");
                    if (state == "toDiscuss") {
                        $("#" + state + " ul").prepend(topicView.render().el);
                    }
                    else if (state == "discuss") {
                        $("#" + state + " ul").prepend(topicView.render().el);
                    }
                    else if (state == "discussed") {
                        $("#" + state + " ul").prepend(topicView.render().el);
                    }
                    topicView.$el.fadeIn("slow");
                }
            }
            });
        },

        broadcastNewTopic: function (topic) {
            socket.emit("newTopic", topic);
        },


        render: function (topic) {
            var topicView = new TopicView({model: topic});
            topicView.$el.hide();
            $("#toDiscuss ul").prepend(topicView.render().el);
            topicView.$el.fadeIn("slow");
            $(".content").eq(0).attr("contentEditable", "true");
            $(".content").eq(0).focus();
        }
    });

    var TopicView = Parse.View.extend({
        tagName: "li",
        model: Topic,
        events: {
            "keypress .content": "validateOnKeyPress",
            "click .content": "makeItemEditable",
            "click .delete": "removeTopic",
            "mousedown .draggable": "sort"
        },
        initialize: function () {
            var self = this;
            socket.on("topicDeleted", function (topicContent) {
                self.removeDeletedTopic(topicContent);
            });
        },

        removeTopic: function () {
            var self = this;
            socket.emit("deleteTopic", this.model.attributes.title);
            this.model.destroy();
            this.$el.fadeOut("slow", function () {
                self.$el.remove();
            });

        },

        removeDeletedTopic: function (topicContent) {
            $(".content").each(function () {
                if ($(this).text() == topicContent) {
                    $(this).parent().fadeOut("slow", function () {
                        $(this).remove();
                    });
                }
            });
        },

        updateTopicTitle: function (value) {
            this.model.set({title: value});
            this.model.save();
        },

        updateTopicState: function (value) {
            this.model.set({state: value});
            this.model.save();
        },

        validateOnKeyPress: function (e) {
            if (e.keyCode == 13) {
                this.$(".content").blur();
                var content = this.$(".content").text();
                this.updateTopicTitle(content);
            }
            if (this.$(".content").text() == "Enter your Topic") {
                this.$(".content").text("");
            }
        },

        makeItemEditable: function () {
            this.$(".content").attr("contentEditable", "true");
            if (this.$(".content").text() == "Enter your Topic") {
                this.$(".content").text("");
            }
            this.$el.addClass("highlight");
        },

        sort: function () {
            var self = this;
            $(".connectSortable").sortable({
                appendTo: "body",
                helper: "default",
                zIndex: 9999,
                connectWith: ".connectSortable",

                stop: function () {
                    $(this).sortable("destroy");
                },

                change: function () {
                    if ($(this).parents("#discuss").length > 0) {
                        self.updateTopicState("discuss");
                    }
                    else if (($(this).parents("#discussed").length > 0)) {
                        self.updateTopicState("discussed");
                    }
                    else if (($(this).parents("#toDiscussed").length > 0)) {
                        self.updateTopicState("toDiscuss");
                    }
                }
            });
        },

        template: _.template($("body #topic").html()),

        render: function () {
            var template = this.template(this.model.toJSON());
            this.$el.html(template);
            return this;
        }
    });

    var LoginView = Parse.View.extend({
        tagName: "div",

        template: _.template($("#login").html()),

        initialize: function () {

            this.render();
        },

        events: {
            "click .register": "register",
            "click .login": "login"
        },

        getLoginInputValue: function () {
            var user = new Parse.User();
            var username = $("input[name=username]").val();
            var password = $("input[name=password]").val();
            user.set({"username": username,
                "password": password
            });
            var repeatPassword = $("input[name=repeatPassword]").val();
            return {"user": user, "password": password, "repeatPassword": repeatPassword};
        },

        login: function () {
            var userInfo = this.getLoginInputValue();
            Parse.User.logIn(userInfo.user.getUsername(), userInfo.password, {
                success: function (user) {
                    console.log(user + " created");
                    $(".overlayLogin").slideToggle("slow");

                    var userName = Parse.User.current().getUsername();
                    startApp();
                    topicsView.loadTopics(userName);
                    socket.emit("joinSession", userName);
                },
                error: function (user, error) {
                    console.log(user + " failed with error: " + error.message);
                    $(".loginFormContainer").animate({left: "-5px"}, 100);
                    $(".loginFormContainer").delay(100).animate({left: "5px"}, 100);
                }
            });

        },
        register: function () {
            var userInfo = this.getLoginInputValue();
            var registerButtonText = $(".register").text();
            if (registerButtonText == "Register") {
                $(".repeatPassword").slideToggle("slow");
                $(".login").slideToggle("slow");
                $(".register").text("Validate");

                var userName = Parse.User.current().getUsername();
                startApp();
                topicsView.loadTopics(userName);
                socket.emit("joinSession", userName);
            }
            else {
                if (userInfo.password == userInfo.repeatPassword) {
                    userInfo.user.set({"password": userInfo.password, "username": userInfo.user.getUsername()});
                    userInfo.user.signUp(null, {
                        success: function () {
                            $(".overlayLogin").slideToggle("slow");
                        },
                        error: function (error) {
                            console.log(error);
                        }
                    });
                }
            }
        },

        render: function () {
            this.$el.html(this.template);
            $("body").append(this.el);
            $(".overlayLogin").slideToggle("slow");
            return this;
        }
    });

    var loginView = new LoginView();

    var startApp = function () {
        topicsCollection = new TopicsCollection();
        topicsView = new TopicsView({collection: topicsCollection});

    };

    $("#howLogo").click(function () {
        $(".overlayHowTo").slideToggle("slow");
    });

    $("#logOutLogo").click(function () {
        Parse.User.logOut();
        topicsView.$el.remove();
        $(".listContainer li").remove();
        loginView.render();
    });
});

