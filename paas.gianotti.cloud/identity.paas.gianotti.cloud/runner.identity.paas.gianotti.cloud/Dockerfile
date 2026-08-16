# Pinned toolchain for every operation against this platform. Running commands
# through this image means a laptop and a CI runner use identical versions, so
# "works on my machine" cannot apply to a terraform plan.
FROM alpine:3.21

ARG TARGETARCH=amd64
ARG TERRAFORM_VERSION=1.10.3
ARG KUBECTL_VERSION=1.32.0
ARG HELM_VERSION=3.16.3
ARG DOCTL_VERSION=1.120.0

RUN apk add --no-cache \
      bash \
      ca-certificates \
      curl \
      docker-cli \
      docker-cli-buildx \
      gettext \
      git \
      jq \
      openssl \
      unzip \
      yq

RUN set -eux; \
    curl -fsSL -o /tmp/terraform.zip \
      "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${TARGETARCH}.zip"; \
    unzip -d /usr/local/bin /tmp/terraform.zip; \
    \
    curl -fsSL -o /usr/local/bin/kubectl \
      "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl"; \
    chmod +x /usr/local/bin/kubectl; \
    \
    curl -fsSL -o /tmp/helm.tar.gz \
      "https://get.helm.sh/helm-v${HELM_VERSION}-linux-${TARGETARCH}.tar.gz"; \
    tar -xzf /tmp/helm.tar.gz -C /tmp; \
    mv "/tmp/linux-${TARGETARCH}/helm" /usr/local/bin/helm; \
    \
    curl -fsSL -o /tmp/doctl.tar.gz \
      "https://github.com/digitalocean/doctl/releases/download/v${DOCTL_VERSION}/doctl-${DOCTL_VERSION}-linux-${TARGETARCH}.tar.gz"; \
    tar -xzf /tmp/doctl.tar.gz -C /usr/local/bin doctl; \
    \
    rm -rf /tmp/*; \
    terraform version; kubectl version --client; helm version --short; doctl version

# Terraform plugin cache survives between runs when /cache is mounted, which
# turns a cold `init` from a minute into a few seconds.
ENV TF_PLUGIN_CACHE_DIR=/cache/terraform-plugins \
    HELM_CACHE_HOME=/cache/helm \
    KUBECONFIG=/work/.kube/config

RUN mkdir -p /cache/terraform-plugins /cache/helm /work

WORKDIR /work

ENTRYPOINT ["/bin/bash", "-lc"]
CMD ["terraform version && kubectl version --client && doctl version"]