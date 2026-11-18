const CACHE_NAME = "learnsphere-v1";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        self.clients.claim()
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method === "GET") {
        event.respondWith(
            fetch(event.request)
        );
    }
});