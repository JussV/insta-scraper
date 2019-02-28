const cheerio = require('cheerio');
const request = require('request');
const User = require('../models/user');
const Post = require('../models/post');
const async = require('async');
const BASE_URL = 'https://www.instagram.com/';

const scrape = (req, res) => {

    let username = req.body.username;
    let url = BASE_URL + username;
    let userId = '';

    return new Promise(function(resolve, reject) {
        request(url, function(err, resp, body){
            if(err)
                throw err;

            $ = cheerio.load(body);

            // Get the script of the html page that contains the json
            let script = $('script').eq(4).html();

            if (script === '')
                return reject(new Error("User is not found on Instagram"));

            if (script.indexOf('config') < 0)
               return reject(new Error("User does not have a public profile on Instagram"));

            // Traverse the JSON of instagram response
            let { entry_data: { ProfilePage : {[0] : { graphql : {user} }} } } = JSON.parse(/window\._sharedData = (.+);/g.exec(script)[1]);

            async.waterfall([

                saveUser = (callback) => {

                    let instaUser = {};
                    instaUser.following = user.edge_follow.count;
                    instaUser.followers = user.edge_followed_by.count;
                    instaUser.name = user.full_name;
                    instaUser.username = user.username;
                    instaUser.description = user.biography;

                    var newUser = new User(instaUser);
                    newUser.save()
                        .then(function(user) {
                            console.log("User has been saved ", user);
                            callback(null, user);
                        }, error => {
                            callback(error);
                        });
                },

                savePostDetails = (instaUser, callback) => {

                    let mediaCollection = user.edge_owner_to_timeline_media.edges;

                    // splice the collection
                    if (mediaCollection.length > 6)
                        mediaCollection = mediaCollection.slice(6, mediaCollection.length);

                    async.each(mediaCollection, function(media, cb){

                        let post = {};
                        post.url = media.node.display_url;
                        post.id = media.node.id;
                        post.caption = media.node.edge_media_to_caption.edges[0].node.text;
                        post.user = instaUser._doc._id;
                        userId = instaUser._doc._id;
                        let newPost = new Post(post);
                        newPost.save()
                            .then(function(post) {
                                console.log("Post has been saved ", post);
                                cb(null, newPost);
                            }, error => {
                                cb(error);
                            });

                    }, function(err) {
                        if( err ) {
                            callback(err);
                        } else {
                            console.log('All posts have been saved successfully');
                            callback(null);
                        }
                    });
                }], function(err) {

                    if(err)  reject(err);

                    // retrieve all posts for the user
                    let result = Post.find({user: userId})
                        .populate('user')
                        .exec();
                    resolve(result)

            });
        })
    })
    .then(respondWithResult(res))
    .catch(handleError(res));

}

const respondWithResult = (res, statusCode) => {
    statusCode = statusCode || 200;
    return function(entity) {
        if (entity) {
            res.status(statusCode).render("posts", {
                posts: entity
            });
        }
    };
}


const handleError = (res, statusCode) => {
    statusCode = statusCode || 400;
    return function(err) {
        res.status(statusCode).render("error", {
            error: err
        });
    };
}

module.exports = {scrape};