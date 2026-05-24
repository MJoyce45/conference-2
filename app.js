/* ══════════════════════════════════════
   CONFÉRENCE DE PENTECÔTE 2026
   Script principal — Firebase Firestore
   ══════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── CONFIGURATION FIREBASE ── */
const firebaseConfig = {
  apiKey:            "AIzaSyDIQiWloL7wax0k4PSSUC7IDy-AaGiV25Q",
  authDomain:        "conference-pentecote.firebaseapp.com",
  projectId:         "conference-pentecote",
  storageBucket:     "conference-pentecote.firebasestorage.app",
  messagingSenderId: "1058561439326",
  appId:             "1:1058561439326:web:b6599e3f6626352c34e6cf"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const COLLECTION = "inscrits";

/* ── ÉTAT LOCAL ── */
var adminConnecte = false;
var ADMIN_PW      = "Pentecote2026";
var DB_LOCAL      = []; // cache des données pour PDF et recherche

/* ════════════════════════════════
   NAVIGATION
   ════════════════════════════════ */
function afficherVue(id) {
  document.getElementById("vue-inscription").classList.remove("active");
  document.getElementById("vue-login").classList.remove("active");
  document.getElementById("vue-admin").classList.remove("active");
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
}

document.getElementById("btnAllerAdmin").addEventListener("click", function () {
  if (adminConnecte) {
    afficherVue("vue-admin");
    chargerInscrits();
  } else {
    document.getElementById("adminPw").value = "";
    document.getElementById("loginError").style.display = "none";
    afficherVue("vue-login");
  }
});

document.getElementById("btnBackLogin").addEventListener("click", function () {
  afficherVue("vue-inscription");
});

document.getElementById("btnBackAdmin").addEventListener("click", function () {
  afficherVue("vue-inscription");
});

/* ════════════════════════════════
   AUTHENTIFICATION
   ════════════════════════════════ */
document.getElementById("btnTogglePw").addEventListener("click", function () {
  var inp = document.getElementById("adminPw");
  inp.type = inp.type === "password" ? "text" : "password";
});

document.getElementById("adminPw").addEventListener("keydown", function (e) {
  if (e.key === "Enter") doLogin();
});

document.getElementById("btnLogin").addEventListener("click", doLogin);

function doLogin() {
  var val = document.getElementById("adminPw").value;
  if (val === ADMIN_PW) {
    adminConnecte = true;
    document.getElementById("loginError").style.display = "none";
    afficherVue("vue-admin");
    chargerInscrits();
  } else {
    document.getElementById("loginError").style.display = "block";
    document.getElementById("adminPw").value = "";
    document.getElementById("adminPw").focus();
  }
}

document.getElementById("btnLogout").addEventListener("click", function () {
  adminConnecte = false;
  DB_LOCAL = [];
  afficherVue("vue-inscription");
});

/* ════════════════════════════════
   FORMULAIRE D'INSCRIPTION
   ════════════════════════════════ */
document.getElementById("f-ddn").setAttribute("max", new Date().toISOString().split("T")[0]);

/* Afficher/masquer le champ "Autre" pour Classe */
document.getElementById("f-classe").addEventListener("change", function () {
  var autreInput = document.getElementById("f-classe-autre");
  if (this.value === "Autre") {
    autreInput.style.display = "block";
    autreInput.focus();
  } else {
    autreInput.style.display = "none";
    autreInput.value = "";
  }
});

document.getElementById("btnInscrire").addEventListener("click", async function () {
  var nom       = document.getElementById("f-nom").value.trim();
  var prenoms   = document.getElementById("f-prenoms").value.trim();
  var ddn       = document.getElementById("f-ddn").value;
  var genreEl   = document.querySelector("input[name='f-genre']:checked");
  var classeVal = document.getElementById("f-classe").value;
  var classe    = classeVal === "Autre"
    ? document.getElementById("f-classe-autre").value.trim()
    : classeVal;
  var classeED  = document.getElementById("f-classeED").value;

  document.getElementById("alertSuccess").style.display  = "none";
  document.getElementById("alertError").style.display    = "none";
  document.getElementById("alertFirebase").style.display = "none";

  if (!nom || !prenoms || !ddn || !genreEl || !classe || !classeED) {
    document.getElementById("alertError").style.display = "block";
    return;
  }

  /* Désactiver le bouton pendant l'envoi */
  var btn = document.getElementById("btnInscrire");
  btn.disabled = true;
  btn.textContent = "Envoi en cours…";

  try {
    await addDoc(collection(db, COLLECTION), {
      nom:       nom,
      prenoms:   prenoms,
      ddn:       ddn,
      genre:     genreEl.value,
      classe:    classe,
      classeED:  classeED,
      inscritLe: new Date().toLocaleDateString("fr-FR"),
      timestamp: Date.now()
    });

    /* Reset formulaire */
    document.getElementById("f-nom").value    = "";
    document.getElementById("f-prenoms").value = "";
    document.getElementById("f-ddn").value    = "";
    document.querySelectorAll("input[name='f-genre']").forEach(function (r) { r.checked = false; });
    document.getElementById("f-classe").value          = "";
    document.getElementById("f-classe-autre").value    = "";
    document.getElementById("f-classe-autre").style.display = "none";
    document.getElementById("f-classeED").value        = "";

    document.getElementById("alertSuccess").style.display = "block";
    window.scrollTo(0, 0);

  } catch (err) {
    console.error("Erreur Firebase :", err);
    document.getElementById("alertFirebase").style.display = "block";
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Valider mon inscription';
  }
});

/* ════════════════════════════════
   CHARGEMENT DES INSCRITS (Firestore)
   ════════════════════════════════ */
async function chargerInscrits() {
  document.getElementById("loadingState").style.display  = "flex";
  document.getElementById("adminContent").style.display  = "none";

  try {
    var q       = query(collection(db, COLLECTION), orderBy("timestamp", "asc"));
    var snapshot = await getDocs(q);
    DB_LOCAL = [];
    snapshot.forEach(function (docSnap) {
      DB_LOCAL.push({ firestoreId: docSnap.id, ...docSnap.data() });
    });
    renderStats();
    renderTable();
  } catch (err) {
    console.error("Erreur chargement :", err);
    document.getElementById("loadingState").innerHTML =
      '<span style="color:#b71c1c">🔴 Erreur de chargement. Vérifiez votre connexion.</span>';
    return;
  }

  document.getElementById("loadingState").style.display  = "none";
  document.getElementById("adminContent").style.display  = "block";
}

/* ════════════════════════════════
   RENDU STATS ET TABLEAU
   ════════════════════════════════ */
function renderStats() {
  var m = 0, f = 0;
  for (var i = 0; i < DB_LOCAL.length; i++) {
    if (DB_LOCAL[i].genre === "Masculin") m++; else f++;
  }
  document.getElementById("statsRow").innerHTML =
    '<div class="stat-box"><div class="stat-num">' + DB_LOCAL.length + '</div><div class="stat-lbl">Total inscrits</div></div>' +
    '<div class="stat-box"><div class="stat-num" style="color:#1565c0">' + m + '</div><div class="stat-lbl">Masculin</div></div>' +
    '<div class="stat-box"><div class="stat-num" style="color:#880e4f">' + f + '</div><div class="stat-lbl">Féminin</div></div>';
}

function renderTable() {
  var q = (document.getElementById("searchInput").value || "").toLowerCase();
  var filtered = DB_LOCAL.filter(function (r) {
    return (r.nom + r.prenoms + r.classe + r.classeED + r.genre).toLowerCase().indexOf(q) !== -1;
  });

  var tbody = document.getElementById("tableBody");
  var empty = document.getElementById("emptyState");

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  var html = "";
  for (var i = 0; i < filtered.length; i++) {
    var r = filtered[i];
    var dateNaiss = "";
    if (r.ddn) {
      try { dateNaiss = new Date(r.ddn + "T00:00:00").toLocaleDateString("fr-FR"); }
      catch (e) { dateNaiss = r.ddn; }
    }
    var badgeClass = r.genre === "Masculin" ? "badge-m" : "badge-f";
    html +=
      "<tr>" +
      '<td style="color:var(--text-muted);font-size:12px">' + (i + 1) + "</td>" +
      "<td><strong>" + r.nom + "</strong></td>" +
      "<td>" + r.prenoms + "</td>" +
      "<td>" + dateNaiss + "</td>" +
      '<td><span class="badge ' + badgeClass + '">' + r.genre + "</span></td>" +
      "<td>" + r.classe + "</td>" +
      "<td>" + r.classeED + "</td>" +
      '<td style="font-size:12px;color:var(--text-muted)">' + r.inscritLe + "</td>" +
      '<td><button class="btn-del" data-fid="' + r.firestoreId + '">✕ Suppr.</button></td>' +
      "</tr>";
  }
  tbody.innerHTML = html;

  tbody.querySelectorAll(".btn-del").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var fid = this.getAttribute("data-fid");
      demanderSupprimer(fid);
    });
  });
}

document.getElementById("searchInput").addEventListener("input", renderTable);

/* ════════════════════════════════
   MODALE DE CONFIRMATION
   ════════════════════════════════ */
var actionEnAttente = null;

function ouvrirModale(emoji, titre, texte, labelConfirm, action) {
  document.getElementById("modalEmoji").textContent   = emoji;
  document.getElementById("modalTitre").textContent   = titre;
  document.getElementById("modalTexte").textContent   = texte;
  document.getElementById("btnConfirmer").textContent = labelConfirm;
  actionEnAttente = action;
  document.getElementById("modalBg").classList.add("open");
}

function fermerModale() {
  document.getElementById("modalBg").classList.remove("open");
  actionEnAttente = null;
}

document.getElementById("btnAnnuler").addEventListener("click", fermerModale);
document.getElementById("btnConfirmer").addEventListener("click", function () {
  var action = actionEnAttente;
  fermerModale();
  if (typeof action === "function") action();
});
document.getElementById("modalBg").addEventListener("click", function (e) {
  if (e.target === this) fermerModale();
});

/* ── Supprimer un inscrit ── */
function demanderSupprimer(firestoreId) {
  ouvrirModale(
    "🗑️", "Supprimer l'inscription ?",
    "Cette action est définitive et ne peut pas être annulée.",
    "Supprimer",
    async function () {
      try {
        await deleteDoc(doc(db, COLLECTION, firestoreId));
        DB_LOCAL = DB_LOCAL.filter(function (r) { return r.firestoreId !== firestoreId; });
        renderStats();
        renderTable();
      } catch (err) {
        console.error("Erreur suppression :", err);
        alert("Erreur lors de la suppression. Vérifiez votre connexion.");
      }
    }
  );
}

/* ── Tout effacer ── */
document.getElementById("btnClearAll").addEventListener("click", function () {
  ouvrirModale(
    "⚠️", "Tout effacer ?",
    "Toutes les inscriptions seront supprimées définitivement sur le serveur. Cette action est irréversible.",
    "Tout effacer",
    async function () {
      try {
        var batch    = writeBatch(db);
        var snapshot = await getDocs(collection(db, COLLECTION));
        snapshot.forEach(function (d) { batch.delete(d.ref); });
        await batch.commit();
        DB_LOCAL = [];
        renderStats();
        renderTable();
      } catch (err) {
        console.error("Erreur effacement :", err);
        alert("Erreur lors de l'effacement. Vérifiez votre connexion.");
      }
    }
  );
});

/* ════════════════════════════════
   EXPORT PDF
   ════════════════════════════════ */
document.getElementById("btnPDF").addEventListener("click", function () {
  if (DB_LOCAL.length === 0) { alert("Aucune inscription à exporter."); return; }

  var jsPDF = window.jspdf.jsPDF;
  var docPdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  var W = docPdf.internal.pageSize.getWidth();

  docPdf.setFillColor(76, 175, 80); docPdf.rect(0, 0, W, 28, "F");
  docPdf.setTextColor(255, 255, 255); docPdf.setFontSize(18); docPdf.setFont("helvetica", "bold");
  docPdf.text("Conférence de Pentecôte 2026", 14, 12);
  docPdf.setFontSize(10); docPdf.setFont("helvetica", "normal");
  docPdf.text("Église Abobo Anonkoua 3  |  Lundi 25 mai 2026 — 08h à 16h", 14, 20);
  docPdf.text("Exporté le " + new Date().toLocaleDateString("fr-FR"), W - 14, 20, { align: "right" });
  docPdf.setFillColor(253, 216, 53); docPdf.rect(0, 28, W, 4, "F");

  var rows = [];
  for (var i = 0; i < DB_LOCAL.length; i++) {
    var r = DB_LOCAL[i];
    var dn = "";
    try { dn = r.ddn ? new Date(r.ddn + "T00:00:00").toLocaleDateString("fr-FR") : ""; } catch (e) {}
    rows.push([i + 1, r.nom, r.prenoms, dn, r.genre, r.classe, r.classeED, r.inscritLe]);
  }

  docPdf.autoTable({
    startY: 38,
    head: [["#", "Nom", "Prénoms", "Date naiss.", "Genre", "Classe", "Classe ED", "Inscrit le"]],
    body: rows,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [56, 142, 60], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [232, 245, 233] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      3: { cellWidth: 28 },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 28 },
      7: { cellWidth: 24 }
    },
    margin: { left: 10, right: 10 }
  });

  var y = docPdf.lastAutoTable.finalY + 8;
  docPdf.setFontSize(9); docPdf.setTextColor(100);
  var m = 0, f = 0;
  for (var i = 0; i < DB_LOCAL.length; i++) {
    if (DB_LOCAL[i].genre === "Masculin") m++; else f++;
  }
  docPdf.text("Total : " + DB_LOCAL.length + "  |  Masculin : " + m + "  |  Féminin : " + f, 14, y);
  docPdf.save("inscrits_pentecote_2026_" + new Date().toISOString().slice(0, 10) + ".pdf");
});
