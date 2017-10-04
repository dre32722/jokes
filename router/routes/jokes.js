var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var config = require("../../config");
var funct = require('./functions');


//CRI change:
var bodyParser = require('body-parser');

// Configure application routes
module.exports = function (app) {

    // CRI change to allow JSON parsing from requests:    
    app.use(bodyParser.json()); // Support for json encoded bodies 
    app.use(bodyParser.urlencoded({
        extended: true
    })); // Support for encoded bodies

    function log(apiMethod, apiUri, msg) {
        console.log("[" + apiMethod + "], [" + apiUri + "], [" + msg + "], [UTC:" +
            new Date().toISOString().replace(/\..+/, '') + "]");
    }

    /**
     * Adding APIs:
     * 
     */

    /* GET Jokes. */
    app.get('/jokes', function (req, res) {

        funct.getJoke(null, function (jk) {

            res.send({
                "id": jk.id,
                "joke": jk.joke
            });

        })

    });


    /* Translate a Joke. */
    app.get('/jokes/:id/translate', function (req, res) {

        // Retrieving parameters:
        var id = req.params.id;
        var lang = req.query.language;


        if (id == null || id == undefined ||
            lang == null || lang == undefined) {
            log("GET", "/jokes/:id", "Id or language are empty or invalid... Nothing to do...");
            res.status(400).end("Id or mobile are empty or invalid... Nothing to do..."); //Bad request...
            return;
        }

        log("GET", "/jokes/:id/translate", "Parameters used are joke id [" + id + "], language is [" + lang +
            "]");

        try {

            // 1) Retrieve joke by id:
            funct.getJoke(id, function (jk) {

                if (jk.id == null || jk.id == undefined ||
                    jk.joke == null || jk.joke == undefined) {

                    console.log("Joke not found, verify Id and try again.");

                    // Something wrong happened, we should not have reached this point...
                    res.send("Joke not found, verify Id and try again."); //Bad request...

                    return;
                }


                console.log("Retrieved joke is [" + JSON.stringify(jk) + "]");

                // 2) Translate joke:
                console.log("Language to be used is [" + lang + "]");

                funct.translateJoke(jk, lang, function (jk) {

                    console.log("Translated joke is [" + JSON.stringify(jk) + "]");

                    try {
                        res.send({
                            "id": jk.id,
                            "joke": jk.joke
                        });
                    } catch (error) {
                        console.log("There was a critical error [" + err + "] - Let's make sure the server does not crash.");

                        // Something wrong happened, we should not have reached this point...
                        res.status(400).end("Oops, something wrong happened, please validate your parameters " +
                            "and try it again."); //Bad request...
                    }
                });

            });

        } catch (err) {

            console.log("There was a critical error [" + err + "] - Let's make sure the server does not crash.");

            // Something wrong happened, we should not have reached this point...
            res.status(400).end("Oops, something wrong happened, please validate your parameters " +
                "and try it again."); //Bad request...
        }


    });

    /* POST jokes to translate and share */
    app.post('/jokes/:id', function (req, res) {

        // Retrieving parameters:
        var id = req.params.id;
        var lang = req.query.language;
        var mobile = req.query.mobile;
        var method = req.query.method
        method = (method == null || method == undefined ? "sms" : method); // SMS is default method


        if (id == null || id == undefined ||
            mobile == null || mobile == undefined) {
            log("GET", "/jokes/:id", "Id or mobile are empty or invalid... Nothing to do...");
            res.status(400).end("Id or mobile are empty or invalid... Nothing to do..."); //Bad request...
            return;
        }

        log("GET", "/jokes", "Parameters used are joke id is [" + id + "], language is [" + lang +
            "], mobile is [" + mobile + "]");

        try {

            // 1) Retrieve joke by id:
            funct.getJoke(id, function (jk) {

                if (jk.id == null || jk.id == undefined ||
                    jk.joke == null || jk.joke == undefined) {

                    console.log("Joke not found, verify Id and try again.");

                    // Something wrong happened, we should not have reached this point...
                    res.send("Joke not found, verify Id and try again."); //Bad request...

                    return;
                }


                console.log("Retrieved joke is [" + JSON.stringify(jk) + "]");

                // 2) Translate joke if required:
                if (lang != null && lang != undefined) {

                    console.log("Language to be used is [" + lang + "]");

                    funct.translateJoke(jk, lang, function (jk) {

                        console.log("Translated joke is [" + JSON.stringify(jk) + "]");

                        // 2.2 Send joke by decided method:
                        console.log("Mobile to be used is [" + mobile + "], method is [" + method + "]");

                        funct.sendNotification(jk, mobile, method, function (msg) {

                            console.log("Notification sent successfully!");
                            // 2.3) Return final joke:
                            try {
                                res.send({
                                    "id": jk.id,
                                    "joke": jk.joke
                                });
                            } catch (error) {
                                console.log("There was a critical error [" + err + "] - Let's make sure the server does not crash.");

                                // Something wrong happened, we should not have reached this point...
                                res.status(400).end("Oops, something wrong happened, please validate your parameters " +
                                    "and try it again."); //Bad request...
                            }

                        });

                    });

                } else {

                    // 3) Translation is not required, let's just send joke by required method:
                    if (mobile != null && mobile != undefined) {

                        console.log("Mobile to be used is [" + mobile + "], method is [" + method + "]");

                        funct.sendNotification(jk, mobile, method, function (msg) {

                            // 4) Return final joke:
                            res.send({
                                "id": jk.id,
                                "joke": jk.joke
                            });

                        });
                    }
                }
            });

        } catch (err) {

            console.log("There was a critical error [" + err + "] - Let's make sure the server does not crash.");

            // Something wrong happened, we should not have reached this point...
            res.status(400).end("Oops, something wrong happened, please validate your parameters " +
                "and try it again."); //Bad request...
        }

    });



    /** Note: This following APIs are hidden to documentation.
     *  It is only to be used by Administrators with responsibility.
     **/

    /* Get All Collections by Name */
    app.get('/collection/:cname', function (req, res) {

        var collectionName = req.params.cname;

        if (collectionName == null || collectionName == undefined) {
            log("GET", "/collection/:cname", "collection name empty or invalid... Nothing to do...");
            res.status(400).end(); //Bad request...
            return;
        }


        var DB_COLLECTION_NAME = collectionName;
        var db = req.db;

        log("GET", "/collection/:cname", "DB_COLLECTION_NAME [" + DB_COLLECTION_NAME + "]");
        var collection = db.get(DB_COLLECTION_NAME);

        collection.find({}, {}, function (e, docs) {

            log("GET", "/collection/:cname", "Found:" + JSON.stringify({
                docs
            }));
            res.send({
                docs
            });

        });
    });
    /* Delete All Collections by Name*/
    app.delete('/collection/:cname', function (req, res) {

        var collectionName = req.params.cname;

        if (collectionName == null || collectionName == undefined) {
            log("DELETE", "/collection/:cname", "collection name empty or invalid... Nothing to do...");
            res.status(400).end(); //Bad request...
            return;
        }


        var DB_COLLECTION_NAME = collectionName;

        var db = req.db;
        log("DELETE", "/collection/:cname", "DB_COLLECTION_NAME [" + DB_COLLECTION_NAME + "]");
        var collection = db.get(DB_COLLECTION_NAME);



        //Remove all documents:
        collection.remove();

        // Return succes answer
        log("DELETE", "/collection/:cname", "All [" + DB_COLLECTION_NAME + "] Records were  deleted successfully...");
        res.send({
            Message: 'Records were  deleted successfully...'
        });
    });


};