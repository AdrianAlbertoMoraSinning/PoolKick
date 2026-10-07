import React,{useState} from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CircleHelp } from 'lucide-react'
import { APP } from '../config'
import { useApp } from '../context/AppContext'
import LanguageSwitcher from '../components/LanguageSwitcher'

const manual={
 en:{
  eyebrow:'Complete operating guide',title:'How to use PoolKick',lead:'A first-time player, commissioner or administrator can understand the platform without outside help.',
  sections:[
   ['start','1. What PoolKick is',['PoolKick is a social football prediction platform built around tournaments. Join a private pool, predict scores before kickoff, earn points and compete on a leaderboard.','It is a prediction game, not a sportsbook. PoolKick does not require wagers or process prize money.']],
   ['account','2. Account & profile',['Create a profile with display name, email and password. In production, authentication is handled by Supabase Auth.','Use Profile to choose an avatar, country flag and favorite team. Your login email is not shown on leaderboards.']],
   ['news','3. Football news',['Open Football News from the navigation. Stories can be filtered by tournament and are shown in English, Spanish or French according to your selected language.','Administrators can publish curated stories in all three languages. A licensed news/data provider can be connected later without redesigning the page.']],
   ['join','4. Join a pool',['Open My Pools, choose Join with code, enter the invitation code from the commissioner and select Join pool.','After joining, the pool appears in My Pools and its tournament matches become available for your predictions.']],
   ['create','5. Create a pool',['Open My Pools and choose Create pool. Add a name, tournament and scoring preset. PoolKick generates a short invitation code to share with friends.','Scoring is fixed after creation so all members compete under the same rules.']],
   ['picks','6. Make predictions',['Open a pool or the tournament hub, enter whole-number scores and save each pick before kickoff.','Predictions can be changed before kickoff. At kickoff the database deadline guard prevents new or edited picks. Other players’ picks remain hidden until the deadline passes.']],
   ['scoring','7. Scoring',['Classic 5–3–2: exact score 5 points, correct goal difference 3, correct winner/draw 2, wrong result 0.','Simple 3–1: exact score 3 points, correct winner/draw 1, wrong result 0.']],
   ['leaderboard','8. Leaderboard',['Each pool has its own ranking. Players are sorted by points and exact scores are the first tie-breaker in the current version.','Results recalculate prediction points automatically when an administrator marks a match final.']],
   ['chat','9. Pool chat',['Pool chat is private to members of that pool. Use it for reminders, reactions and football conversation.','Messages include the player name, avatar and timestamp. Production can use Supabase Realtime so new messages appear without refreshing.']],
   ['commissioner','10. Commissioner',['The creator of a pool is its commissioner. The commissioner shares the code, explains scoring and keeps the group organized.','A commissioner does not edit other players’ picks or official results.']],
   ['admin','11. Platform admin',['The Admin area controls tournament availability, final scores and the multilingual newsfeed.','Admins can sync fixtures, results and logos using Sync now in Tournaments, Live Scores or Admin. The current provider may return limited coverage; sync errors are displayed. Rankings supports overall and per-tournament standings.']],
   ['support','12. Donations & ads',['PoolKick is intentionally ad-free. Donations are voluntary and never affect access, points or ranking.','The donation button is ready for Marlon’s final payment link. Card details should be processed by the selected payment provider, not stored by PoolKick.']],
   ['faq','13. FAQ',['Can I change a pick? Yes, until kickoff. Can one person join several pools? Yes. Are points shared between pools? No.','Can the brand change? Yes. Name, logo, colors and donation URL are centralized so Marlon’s final identity can replace the temporary PoolKick brand.']]
  ],
  tip:'Change language at any time with EN / ES / FR. Your choice is saved on the device.'
 },
 es:{
  eyebrow:'Guía completa de operación',title:'Cómo usar PoolKick',lead:'Un jugador nuevo, comisionado o administrador puede entender la plataforma sin ayuda externa.',
  sections:[
   ['start','1. Qué es PoolKick',['PoolKick es una plataforma social de pronósticos de fútbol enfocada en torneos. Únete a una quiniela privada, pronostica marcadores antes del inicio, suma puntos y compite en un ranking.','Es un juego de pronósticos, no una casa de apuestas. PoolKick no exige apuestas ni procesa premios en dinero.']],
   ['account','2. Cuenta y perfil',['Crea un perfil con nombre visible, correo y contraseña. En producción, la autenticación funciona con Supabase Auth.','En Perfil puedes elegir avatar, bandera y equipo favorito. Tu correo de acceso no aparece en los rankings.']],
   ['news','3. Noticias de fútbol',['Abre Noticias desde la navegación. Puedes filtrar por torneo y leer en inglés, español o francés según el idioma seleccionado.','Los administradores pueden publicar noticias seleccionadas en los tres idiomas. Más adelante puede conectarse un proveedor licenciado sin rediseñar la sección.']],
   ['join','4. Unirse a una quiniela',['Abre Mis Quinielas, selecciona Unirme con código, escribe el código del comisionado y confirma.','Al ingresar, la quiniela aparece en Mis Quinielas y quedan disponibles sus partidos para pronosticar.']],
   ['create','5. Crear una quiniela',['Abre Mis Quinielas y selecciona Crear quiniela. Define nombre, torneo y sistema de puntuación. PoolKick genera un código corto para compartir.','La puntuación queda fija después de crear la quiniela para que todos compitan con las mismas reglas.']],
   ['picks','6. Hacer pronósticos',['Abre una quiniela o el centro de torneos, ingresa marcadores enteros y guarda antes del inicio.','Puedes modificar el pronóstico antes del kickoff. Al iniciar el partido, la base de datos bloquea inserciones y cambios. Los pronósticos ajenos permanecen ocultos hasta la fecha límite.']],
   ['scoring','7. Puntuación',['Clásico 5–3–2: marcador exacto 5 puntos, diferencia correcta 3, ganador/empate correcto 2, resultado incorrecto 0.','Simple 3–1: marcador exacto 3 puntos, ganador/empate correcto 1, resultado incorrecto 0.']],
   ['leaderboard','8. Ranking',['Cada quiniela tiene su propia tabla. Los jugadores se ordenan por puntos y los marcadores exactos son el primer desempate de la versión actual.','Los puntos se recalculan automáticamente cuando un administrador marca un partido como finalizado.']],
   ['chat','9. Chat de la quiniela',['El chat es privado para los integrantes de esa quiniela. Úsalo para recordatorios, reacciones y conversación futbolera.','Los mensajes muestran nombre, avatar y hora. En producción Supabase Realtime puede hacer que aparezcan sin refrescar la página.']],
   ['commissioner','10. Comisionado',['Quien crea una quiniela es su comisionado. Comparte el código, explica la puntuación y organiza el grupo.','El comisionado no edita pronósticos de otros jugadores ni resultados oficiales.']],
   ['admin','11. Administración',['El área Admin controla disponibilidad de torneos, resultados finales y el feed de noticias multilingüe.','El administrador puede sincronizar partidos, resultados y logos desde Torneos, Resultados o Admin. La cobertura del proveedor puede ser limitada; los errores se muestran. Rankings permite consultar la clasificación general y por torneo.']],
   ['support','12. Donaciones y publicidad',['PoolKick está diseñado sin anuncios. Las donaciones son voluntarias y nunca afectan acceso, puntos o posición.','El botón de donación queda listo para el enlace de pago final de Marlon. Los datos de tarjeta deben procesarse en el proveedor de pago y no almacenarse en PoolKick.']],
   ['faq','13. Preguntas frecuentes',['¿Puedo cambiar un pronóstico? Sí, hasta el inicio. ¿Puedo estar en varias quinielas? Sí. ¿Se comparten puntos entre quinielas? No.','¿Puede cambiar la marca? Sí. Nombre, logo, colores y enlace de donación están centralizados para reemplazar la marca temporal cuando Marlon entregue la identidad final.']]
  ],
  tip:'Puedes cambiar de idioma en cualquier momento con EN / ES / FR. La selección queda guardada en el dispositivo.'
 },
 fr:{
  eyebrow:'Guide complet d’utilisation',title:'Comment utiliser PoolKick',lead:'Un nouveau joueur, un commissaire ou un administrateur peut comprendre la plateforme sans aide extérieure.',
  sections:[
   ['start','1. Qu’est-ce que PoolKick',['PoolKick est une plateforme sociale de pronostics football centrée sur les tournois. Rejoignez un pool privé, pronostiquez les scores avant le coup d’envoi, gagnez des points et montez au classement.','C’est un jeu de pronostics, pas un site de paris. PoolKick n’exige aucune mise et ne traite pas de prix en argent.']],
   ['account','2. Compte et profil',['Créez un profil avec nom affiché, courriel et mot de passe. En production, l’authentification est gérée par Supabase Auth.','Dans Profil, choisissez un avatar, un drapeau et une équipe favorite. Votre courriel de connexion n’apparaît pas dans les classements.']],
   ['news','3. Actualités football',['Ouvrez Actualités dans la navigation. Filtrez par tournoi et lisez les articles en anglais, espagnol ou français selon la langue choisie.','Les administrateurs peuvent publier des nouvelles sélectionnées dans les trois langues. Un fournisseur sous licence pourra être connecté plus tard sans refaire la page.']],
   ['join','4. Rejoindre un pool',['Ouvrez Mes pools, choisissez Rejoindre avec un code, saisissez le code du commissaire puis confirmez.','Après l’adhésion, le pool apparaît dans Mes pools et ses matchs deviennent disponibles pour vos pronostics.']],
   ['create','5. Créer un pool',['Ouvrez Mes pools et choisissez Créer un pool. Ajoutez un nom, un tournoi et un barème. PoolKick génère un code court à partager.','Le barème reste fixe après la création afin que tous les membres jouent selon les mêmes règles.']],
   ['picks','6. Faire des pronostics',['Ouvrez un pool ou le centre des tournois, saisissez des scores entiers et enregistrez-les avant le coup d’envoi.','Les pronostics peuvent être modifiés avant le match. Au coup d’envoi, la base de données bloque les nouvelles saisies et modifications. Les pronostics des autres restent masqués jusqu’à l’échéance.']],
   ['scoring','7. Barème',['Classique 5–3–2 : score exact 5 points, bonne différence de buts 3, bon vainqueur/nul 2, mauvais résultat 0.','Simple 3–1 : score exact 3 points, bon vainqueur/nul 1, mauvais résultat 0.']],
   ['leaderboard','8. Classement',['Chaque pool possède son propre classement. Les joueurs sont triés par points et les scores exacts servent de premier départage dans la version actuelle.','Les points sont recalculés automatiquement lorsqu’un administrateur valide le score final.']],
   ['chat','9. Chat du pool',['Le chat est privé aux membres du pool. Utilisez-le pour rappels, réactions et discussions football.','Les messages affichent nom, avatar et heure. En production, Supabase Realtime peut les afficher sans actualiser la page.']],
   ['commissioner','10. Commissaire',['Le créateur d’un pool devient son commissaire. Il partage le code, explique le barème et organise le groupe.','Le commissaire ne modifie pas les pronostics des autres joueurs ni les résultats officiels.']],
   ['admin','11. Administration',['La zone Admin contrôle les tournois disponibles, les scores finaux et le fil d’actualités multilingue.','Les administrateurs peuvent synchroniser les matchs, résultats et logos depuis Tournois, Scores ou Admin. La couverture du fournisseur peut être limitée ; les erreurs sont affichées. Classements propose un classement général et par tournoi.']],
   ['support','12. Dons et publicité',['PoolKick est volontairement sans publicité. Les dons sont facultatifs et n’affectent jamais l’accès, les points ou le classement.','Le bouton de don est prêt pour le lien de paiement final de Marlon. Les données de carte doivent être traitées par le fournisseur de paiement et non stockées par PoolKick.']],
   ['faq','13. FAQ',['Puis-je modifier un pronostic ? Oui, jusqu’au coup d’envoi. Puis-je rejoindre plusieurs pools ? Oui. Les points sont-ils partagés entre pools ? Non.','La marque peut-elle changer ? Oui. Le nom, logo, couleurs et lien de don sont centralisés pour remplacer la marque temporaire quand Marlon finalisera l’identité.']]
  ],
  tip:'Changez de langue à tout moment avec EN / ES / FR. Votre choix est enregistré sur l’appareil.'
 }
}

export default function Manual({publicView=false}){
 const {state}=useApp()
 const copy=manual[state.locale]||manual.en
 const [active,setActive]=useState('start')
 return <div className={publicView?'manual-public':''}>
  {publicView&&<header className="manual-public-head"><Link to="/" className="brand">⚽ {APP.name}</Link><LanguageSwitcher compact/></header>}
  <div className="manual-layout">
   <aside className="manual-nav"><div><BookOpen/><b>{copy.title}</b></div>{copy.sections.map(s=><button key={s[0]} className={active===s[0]?'active':''} onClick={()=>{setActive(s[0]);document.getElementById(s[0])?.scrollIntoView({behavior:'smooth'})}}>{s[1]}</button>)}</aside>
   <article className="manual-content"><div className="manual-title-row"><div><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1></div>{!publicView&&<LanguageSwitcher compact/>}</div><p className="lead">{copy.lead}</p>
    {copy.sections.map(([id,title,paras])=><section id={id} key={id}><h2>{title}</h2>{paras.map((p,i)=><p key={i}>{p}</p>)}</section>)}
    <div className="manual-end"><CircleHelp/><div><b>EN · ES · FR</b><span>{copy.tip}</span></div></div>
   </article>
  </div>
 </div>
}
