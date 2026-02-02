FROM oryd/keto:v25.4.0

COPY keto.yml /etc/keto/keto.yml
COPY namespaces /etc/keto/namespaces
COPY --chmod=755 entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]