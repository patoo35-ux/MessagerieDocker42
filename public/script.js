// 1. Sélection des éléments HTML dans la page
const form = document.forms.messagerie
const liste = document.querySelector('[data-messages]')

// 2. Fonction pour charger et afficher tous les messages
async function loadMessages() {
  try {
    const res = await fetch('/api/messages')
    
    if (!res.ok) {
      throw new Error('Impossible de récupérer les messages depuis le serveur.')
    }

    const data = await res.json()

    // Génération du HTML avec un bouton "Supprimer" pour chaque message
    // On utilise onclick="deleteMessage(${m.id})" pour déclencher la suppression
    liste.innerHTML = data.map(m => {
      return `
        <li>
          <strong>#${m.id}</strong> "${m.texte}" 
          <button onclick="deleteMessage(${m.id})">Supprimer 🗑️</button>
        </li>
      `
    }).join('')

  } catch (err) {
    console.error('Erreur lors du chargement des messages :', err.message)
  }
}

// 3. Fonction pour supprimer un message spécifique
async function deleteMessage(id) {
  try {
    // Demande au serveur de supprimer le message ayant cet ID
    const res = await fetch(`/api/messages/${id}`, {
      method: 'DELETE'
    })

    if (!res.ok) {
      const errData = await res.json()
      console.error('Erreur lors de la suppression :', errData.error)
      return
    }

    console.log(`✅ Message #${id} supprimé !`)

    // Recharge la liste mise à jour immédiatement
    await loadMessages()

  } catch (err) {
    console.error('Erreur réseau lors de la suppression :', err.message)
  }
}

// 4. Gestionnaire d'événement à la soumission du formulaire
form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const champTexte = form.elements.message
  const texteSaisi = champTexte.value.trim()

  // Validation : le champ ne doit pas être vide
  if (texteSaisi === '') {
    console.error('⚠️ Saisie invalide : L\'utilisateur a essayé d\'envoyer une chaîne vide.')
    alert('Veuillez saisir un texte valide avant d\'envoyer !')
    champTexte.focus()
    return
  }

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ texte: texteSaisi })
    })

    if (!res.ok) {
      const errData = await res.json()
      console.error('Erreur serveur :', errData.error)
      return
    }

    champTexte.value = ''
    await loadMessages()

  } catch (err) {
    console.error('Erreur lors de l\'envoi du message :', err.message)
  }
})

// Chargement initial des messages au démarrage
loadMessages()