# ./Dockerfile

FROM nginx:stable

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/conf.d/my-react-lb.conf /etc/nginx/conf.d/my-react-lb.conf

CMD ["nginx", "-g", "daemon off;"]