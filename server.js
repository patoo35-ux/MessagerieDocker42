import express from 'express'
import dotenv from 'dotenv'
import pg from 'pg'

// 1. Chargement des variables d'environnement depuis le fichier .env
dotenv.config()

const { Pool } = pg
const app = express()
const PORT = process.env.PORT || 3000

// 2. Middlewares (Les préparateurs de requêtes)
app.use(express.json()) // Permet de lire le JSON envoyé dans les requêtes POST
app.use(express.static('public')) // Sert les fichiers statiques (html, css, js) depuis le dossier public

// 3. Configuration du pool de connexion PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'postgres'
})

// 4. Initialisation de la Base de Données (avec tentative répétée en cas de délai avec Docker)
async function initDB() {
  let connected = false
  let retries = 5

  while (!connected && retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          texte VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `)
      console.log('✅ Base de données connectée et table initialisée !')
      connected = true
    } catch (err) {
      retries -= 1
      console.error(`⚠️ Erreur de connexion BDD. Essais restants: ${retries}`, err.message)
      // Attend 3 secondes avant de réessayer
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}

// 5. Route GET : Récupérer tous les messages
app.get('/api/messages', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY id DESC')
    // On renvoie result.rows (le tableau de messages) et non l'objet result complet
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur GET /api/messages:', err.message)
    res.status(500).json({ error: 'Erreur lors de la récupération des messages.' })
  }
})

// 6. Route POST : Ajouter un nouveau message
app.post('/api/messages', async (req, res) => {
  try {
    const { texte } = req.body

    // Vérification : le texte ne doit pas être vide
    if (!texte || texte.trim() === '') {
      return res.status(400).json({ error: 'Le champ texte est obligatoire.' })
    }

    const result = await pool.query(
      'INSERT INTO messages (texte) VALUES ($1) RETURNING *',
      [texte.trim()]
    )

    // On renvoie l'élément inséré (premier élément du tableau rows)
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Erreur POST /api/messages:', err.message)
    res.status(500).json({ error: 'Erreur lors de la sauvegarde du message.' })
  }
})

// 7. Lancement du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port : http://localhost:${PORT}`)
  initDB()
})

// 8. Route DELETE : Supprimer un message grâce à son ID
app.delete('/api/messages/:id', async (req, res) => {
  try {
    // Récupération de l'ID passé dans l'URL (ex: /api/messages/3 -> id = 3)
    const { id } = req.params

    // Requête SQL pour supprimer le message correspondant
    const result = await pool.query(
      'DELETE FROM messages WHERE id = $1 RETURNING *',
      [id]
    )

    // Si aucun message n'a été trouvé avec cet ID
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Message non trouvé.' })
    }

    // Confirmation de la suppression
    res.json({ message: `Le message #${id} a été supprimé avec succès.` })

  } catch (err) {
    console.error('Erreur DELETE /api/messages:', err.message)
    res.status(500).json({ error: 'Erreur lors de la suppression du message.' })
  }
})