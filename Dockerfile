# Dockerfile pour outils.crem.fr
# Application web statique servie par nginx

FROM nginx:alpine

# Copier la configuration nginx personnalisee
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers de l'application
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY pages/ /usr/share/nginx/html/pages/

# Copier le plugin Moodle (pour telechargement)
COPY moodle-plugin/ /usr/share/nginx/html/moodle-plugin/

# Exposer le port 80
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
