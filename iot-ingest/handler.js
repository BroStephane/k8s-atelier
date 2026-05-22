"use strict";
const { Pool } = require("pg");

// 1. INITIALISATION DU POOL (En dehors du handler)
// Ceci n'est exécuté qu'une seule fois au démarrage du pod
const pool = new Pool({
  user: "iot_admin",
  password: "password123",
  host: "postgres-service.default.svc.cluster.local",
  port: 5432,
  database: "iot_database",
  max: 10, // On maintient un pool de 10 connexions prêtes à l'emploi
  idleTimeoutMillis: 30000,
});

module.exports = async (event, context) => {
  // 2. LE HANDLER (Exécuté à chaque requête)
  const mesure = event.body;

  if (!mesure || !mesure.id) {
    return context.status(400).fail({ erreur: "Données invalides" });
  }

  let statut = "nominale";
  if (mesure.temperature > 80 || mesure.vibration > 5.0) {
    statut = "anormale";
  }

  try {
    // 3. EXÉCUTION OPTIMISÉE
    // On ne crée plus la table à chaque fois, et on pioche directement dans le pool.
    const query =
      "INSERT INTO mesures(capteur_id, temperature, vibration, qualification) VALUES($1, $2, $3, $4)";
    const values = [mesure.id, mesure.temperature, mesure.vibration, statut];

    await pool.query(query, values);

    return context.status(200).succeed({
      message: "Mesure persistée avec succès (Version Optimisée !)",
      capteur_id: mesure.id,
      qualification: statut,
    });
  } catch (err) {
    console.error("Erreur base de données", err);
    return context
      .status(500)
      .fail({ erreur: "Impossible de persister la donnée" });
  }
};
