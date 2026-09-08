const CACHE_VERSION = "drive-v1";

const APP_SHELL = [

    "./",

    "./index.html",

    "./styles.css",

    "./app.js",

    "./db.js",

    "./gps.js",

    "./manifest.json",

    "./icons/icon.svg"

];


/* =========================================
   INSTALL
========================================= */

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(CACHE_VERSION)
                .then(cache => {

                    return cache.addAll(
                        APP_SHELL
                    );

                })

        );


        /*
         * We deliberately DO NOT immediately
         * activate the new worker.
         *
         * The page decides when to update.
         */

    }
);


/* =========================================
   ACTIVATE
========================================= */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(keys => {

                    return Promise.all(

                        keys
                            .filter(
                                key =>
                                    key !==
                                    CACHE_VERSION
                            )
                            .map(
                                key =>
                                    caches.delete(
                                        key
                                    )
                            )

                    );

                })

        );


        self.clients.claim();

    }
);


/* =========================================
   FETCH
========================================= */

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


        /*
         * Only handle GET requests.
         */

        if (
            request.method !== "GET"
        ) {

            return;

        }


        event.respondWith(

            caches
                .match(request)
                .then(cachedResponse => {

                    if (cachedResponse) {

                        /*
                         * Cache first for the
                         * application shell.
                         */

                        return cachedResponse;

                    }


                    /*
                     * Network fallback.
                     */

                    return fetch(request)
                        .then(response => {

                            /*
                             * Don't cache bad responses.
                             */

                            if (
                                !response ||
                                response.status !== 200
                            ) {

                                return response;

                            }


                            const responseClone =
                                response.clone();


                            caches
                                .open(CACHE_VERSION)
                                .then(cache => {

                                    cache.put(
                                        request,
                                        responseClone
                                    );

                                });


                            return response;

                        })
                        .catch(() => {

                            /*
                             * If navigation fails
                             * completely, serve
                             * the cached app shell.
                             */

                            if (
                                request.mode ===
                                "navigate"
                            ) {

                                return caches.match(
                                    "./index.html"
                                );

                            }

                        });

                })

        );

    }
);


/* =========================================
   UPDATE CONTROL
========================================= */

self.addEventListener(
    "message",
    event => {

        if (
            event.data?.type ===
            "SKIP_WAITING"
        ) {

            self.skipWaiting();

        }

    }
);
