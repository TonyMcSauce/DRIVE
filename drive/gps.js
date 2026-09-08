const GPS = {

    watchId: null,

    points: [],

    startTime: null,

    lastPoint: null,

    distance: 0,


    start() {

        if (!navigator.geolocation) {

            throw new Error(
                "Geolocation is not supported by this browser."
            );

        }


        this.points = [];
        this.distance = 0;

        this.startTime = Date.now();

        this.lastPoint = null;


        this.watchId =
            navigator.geolocation.watchPosition(

                position => {

                    this.handlePosition(position);

                },

                error => {

                    console.warn(
                        "GPS error:",
                        error.message
                    );

                },

                {
                    enableHighAccuracy: true,

                    maximumAge: 3000,

                    timeout: 10000
                }

            );

    },


    handlePosition(position) {

        const point = {

            lat: position.coords.latitude,

            lng: position.coords.longitude,

            accuracy: position.coords.accuracy,

            speed: position.coords.speed,

            timestamp: position.timestamp

        };


        this.points.push(point);


        if (this.lastPoint) {

            const segment =
                this.distanceBetween(
                    this.lastPoint.lat,
                    this.lastPoint.lng,
                    point.lat,
                    point.lng
                );


            /*
             * Ignore very inaccurate GPS jumps.
             */

            if (
                point.accuracy < 100 &&
                segment < 0.5
            ) {

                this.distance += segment;

            }

            else if (
                point.accuracy < 50 &&
                segment < 2
            ) {

                this.distance += segment;

            }

        }


        this.lastPoint = point;


        document.dispatchEvent(
            new CustomEvent(
                "gpsupdate",
                {
                    detail: {
                        point,
                        distance: this.distance
                    }
                }
            )
        );

    },


    stop() {

        if (this.watchId !== null) {

            navigator.geolocation.clearWatch(
                this.watchId
            );

        }


        this.watchId = null;

    },


    distanceBetween(
        lat1,
        lon1,
        lat2,
        lon2
    ) {

        const R = 6371;


        const dLat =
            this.toRadians(lat2 - lat1);

        const dLon =
            this.toRadians(lon2 - lon1);


        const a =
            Math.sin(dLat / 2) ** 2 +

            Math.cos(this.toRadians(lat1)) *
            Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;


        const c =
            2 *
            Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            );


        return R * c;

    },


    toRadians(value) {

        return value * Math.PI / 180;

    }

};
