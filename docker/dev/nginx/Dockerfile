FROM nginx:1.13.12-alpine

RUN rm -rf /etc/nginx/conf.d \
 && mkdir -p /etc/nginx/sites-available \
 && mkdir -p /etc/nginx/sites-enabled

ADD nginx.conf /etc/nginx/nginx.conf
ADD www.conf /etc/nginx/sites-available/www.conf
RUN ln -s /etc/nginx/sites-available/www.conf /etc/nginx/sites-enabled/www.conf

ENTRYPOINT ["nginx"]