const http = require('http');

const data = JSON.stringify({ username: "admin", password: "sml12345" });

const req = http.request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        const payload = JSON.parse(body);
        console.log("Login Token:", payload.token ? "SUCCESS" : "FAIL");
        const token = payload.token;
        const tenant_id = payload.user.allowedTenants[1].id;

        const switchData = JSON.stringify({ tenant_id });
        const req2 = http.request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/auth/switch-tenant',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': switchData.length, 'Authorization': 'Bearer ' + token }
        }, (res2) => {
            let body2 = '';
            res2.on('data', chunk => body2 += chunk);
            res2.on('end', () => {
                console.log("Switch Status:", res2.statusCode);
                console.log("Switch Body:", body2.substring(0, 100));
            });
        });
        req2.write(switchData);
        req2.end();
    });
});
req.write(data);
req.end();
