FROM oryd/keto:v25.4.0

COPY keto.yml /etc/keto/keto.yml
COPY namespaces /etc/keto/namespaces
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]