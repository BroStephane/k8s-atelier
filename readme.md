# 📝 Mémo Présentation : Atelier Kubernetes & GitOps

## 1. La Partie Docker (Build & Registry)

_L'objectif était de transformer le code Node.js en une image universelle et de la mettre à disposition du cluster._

- **Build de l'image :**
  ```powershell
  docker build -t mon-app-node:v1 .
  ```
- **Tag pour Docker Hub (remplacer par ton pseudo) :**
  ```powershell
  docker tag mon-app-node:v1 broboosted/mon-app-node:v1
  ```
- **Push sur le registre distant :**
  ```powershell
  docker push broboosted/mon-app-node:v1
  ```

---

## 2. La Partie GitOps avec ArgoCD

_ArgoCD surveille GitHub et synchronise l'état du cluster automatiquement._

- **Accès interface :** `https://localhost:8080`
- **Concept clé à expliquer :** Le **"Self-Healing"**. Si on modifie manuellement le cluster, ArgoCD le remet en conformité avec Git.
- **Les 2 Applications créées :**
  - `node-app-dev` (Source : `k8s/overlays/dev`)
  - `node-app-prod` (Source : `k8s/overlays/prod`)

---

## 3. La Partie Multi-Environnement (Kustomize)

_On utilise une **Base** commune et des **Overlays** pour différencier la Dev de la Prod sans dupliquer le code._

- **Différences implémentées :**
  - **Réplicas :** 2 en Dev vs 3 en Prod.
  - **Configuration :** Messages différents via ConfigMaps distincts.
  - **Isolation :** Utilisation de `commonLabels` (`env: dev` vs `env: prod`) pour éviter que les services ne mélangent les pods.
  - **Ports :** 30081 (Dev) vs 30082 (Prod).

---

## 4. Les Commandes de Démo (Le jour J)

_C'est ce que tu devras taper devant le jury pour prouver que ça marche._

- **Vérifier l'état des ressources :**
  ```powershell
  kubectl get pods
  kubectl get svc
  ```
- **Accéder aux applications (Tunneling) :**
  - _Ouvrir un terminal pour ArgoCD :_

    ```powershell
    kubectl -n argocd port-forward svc/argocd-server 8080:443
    ```

  - _Identifiants ArgoCD :_

    ```text
    User : Admin
    Mdp : hbHkycTvr4UBFkzS
    ```

  - _Ouvrir un terminal pour la DEV :_
    ```powershell
    kubectl port-forward svc/dev-node-app-service 30081:80
    ```
  - _Ouvrir un terminal pour la PROD :_
    ```powershell
    kubectl port-forward svc/prod-node-app-service 30082:80
    ```

---

## 5. Le Kit de "Survie" (En cas de pépin)

_Si une modification ne s'affiche pas, utilise ces commandes de nettoyage._

- **Forcer la relecture de la configuration (Redémarrage des Pods) :**
  ```powershell
  kubectl delete pods --all
  ```
- **Forcer la mise à jour des Sélecteurs (Si ArgoCD est "OutOfSync") :**
  ```powershell
  kubectl delete deployment dev-node-app-deployment
  kubectl delete deployment prod-node-app-deployment
  ```
  _(Ensuite, clique sur **SYNC** dans ArgoCD avec l'option **REPLACE** cochée)._

1. **Montrer l'effet miroir :** Changer le message dans `configmap.yaml` sur GitHub, fair un `git push`, et montre qu'ArgoCD devient bleu (Syncing) puis vert tout seul.

2. **Montrer le Self-Healing :** Supprimer un pod manuellement (`kubectl delete pod <nom-du-pod>`) et montrer à l'auditoire que Kubernetes (ou ArgoCD) en recrée un instantanément pour maintenir le nombre de réplicas exigé.

---

## 6. La Partie Serverless & IoT (OpenFaaS)

_L'objectif est de démontrer l'ingestion en temps réel d'un flux de capteurs, l'optimisation serverless et la persistance en base de données relationnelle._

- **Ouvrir l'accès à l'interface OpenFaaS (Gateway) :**
  ```powershell
  kubectl port-forward -n openfaas svc/gateway 8080:8080
  ```

* **Build, Push & Déploiement de la fonction (Version Optimisée) :**
  _On utilise le registre éphémère ttl.sh pour contourner la restriction de licence locale OpenFaaS._

```powershell
# 1. Copie du code dans le dossier de template (contournement bug Windows)
Copy-Item -Path .\iot-ingest\* -Destination .\template\node18\function\ -Recurse -Force

# 2. Build de l'image Docker
docker build -t ttl.sh/ton-pseudo-iot-ingest:v3 .\template\node18\

# 3. Push de l'image sur internet
docker push ttl.sh/ton-pseudo-iot-ingest:v3

# 4. Déploiement sur le cluster
.\faas-cli.exe deploy -f stack.yaml
```

---

## 7. Les Commandes de Démo IoT (Le Crash Test)

_C'est ici que tu prouves au jury que ton optimisation (le Pool de Connexions PostgreSQL) permet d'absorber une charge industrielle sans s'effondrer._

- **Test Unitaire (Vérifier la qualification de l'anomalie) :**
  _Montre que si la température dépasse 80°C, le statut passe en "anormale"._

```powershell
Invoke-RestMethod -Uri "[http://127.0.0.1:8080/function/iot-ingest](http://127.0.0.1:8080/function/iot-ingest)" -Method Post -ContentType "application/json" -Body '{"id": "capteur-demo-1", "temperature": 85, "vibration": 3.2}'

```

- **Le Crash Test (Stress Test Serverless) :**
  _Exécute ce script pour simuler 200 capteurs envoyant leurs données simultanément et mesurer le temps de réponse global._

```powershell
Measure-Command {
    1..200 | ForEach-Object {
        try {
            $response = Invoke-RestMethod -Uri "[http://127.0.0.1:8080/function/iot-ingest](http://127.0.0.1:8080/function/iot-ingest)" -Method Post -ContentType "application/json" -Body '{"id": "capteur-test-charge", "temperature": 90, "vibration": 8.0}'
            Write-Host "." -NoNewline -ForegroundColor Green
        } catch {
            Write-Host "X" -NoNewline -ForegroundColor Red
        }
    }
    Write-Host "`nTest terminé !" -ForegroundColor Cyan
}

```

_Argumentaire à dire à l'oral : "Grâce au Pool de connexions, nous sommes passés de ~8 secondes à ~3 secondes pour 200 requêtes, tout en gardant une stabilité de 100%."_

- **La Preuve de Persistance (Consultation Base de Données) :**
  _Prouve que les centaines de mesures ont bien été sauvegardées._

```powershell
# 1. Entrer dans le conteneur PostgreSQL
kubectl exec -it deployment/postgres -- psql -U iot_admin -d iot_database

# 2. Lancer la requête SQL (une fois dans l'invite psql)
SELECT * FROM mesures;

# 3. Quitter la base de données
\q
```
