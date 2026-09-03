npx playwright install-deps chromium

If that fails (it sometimes needs root), run:


sudo npx playwright install-deps chromium

That installs all the required Linux libraries (libatk, libgbm, libasound, etc.) in one shot.

After it finishes, test it immediately:


cd /var/www/shriram/backend/scrapper
node -e "const { chromium } = require('playwright'); chromium.launch({ headless: true }).then(b => { console.log('OK'); b.close(); }).catch(e => console.error(e.message))"
If you see OK, Playwright is working. Then restart your backend:


pm2 restart mycrm-backend


If install-deps still fails (some VPS providers have a very minimal OS), install the missing libs manually:


apt-get install -y \
  libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
  libpangocairo-1.0-0 libnss3 libnspr4 libx11-xcb1
On Ubuntu 24.04 (which your server might be, since the log said "fallback build for ubuntu24.04"), some package names have a t64 suffix:


apt-get install -y \
  libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 \
  libdrm2 libxkbcommon0 libgbm1 libasound2t64 \
  libpango-1.0-0 libnss3 libnspr4

/////////////////////////////////////// Nginx config file

server {
    listen 80;
    server_name crm.technicaltiwariji.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name crm.technicaltiwariji.com;

    root /var/www/shriram/frontend/dist;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/crm.technicaltiwariji.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.technicaltiwariji.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /uploads/ {
        alias /var/www/shriram/backend/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # ── GMB scraper — needs a long timeout (Playwright takes time) ──
    location /api/gmb/ {
        proxy_pass http://127.0.0.1:4050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
