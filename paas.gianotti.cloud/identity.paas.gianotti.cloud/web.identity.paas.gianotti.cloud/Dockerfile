# Static frontend on unprivileged nginx. All environment-specific values are
# injected at container start, so one image promotes unchanged from the local
# compose stack to the cluster.
FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root

COPY html/ /usr/share/nginx/html/
COPY templates/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/ /docker-entrypoint.d/

RUN chmod +x /docker-entrypoint.d/*.sh /docker-entrypoint.d/*.envsh \
 && chown -R 101:101 /usr/share/nginx/html

USER 101

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1