const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  databaseURL: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let pageId = window.location.pathname.split("/").pop().replace(/\.[^/.]+$/, "");

const chatRef = database.ref("comments/" + pageId);
const userProfileRef = database.ref("user_profiles");

const auth = firebase.auth();

auth.signInAnonymously()
  .then(() => {
    console.log("User signed in anonymously");
    chatRef.on("child_added", function(snapshot) {
      const message = snapshot.val();

      const messageId = snapshot.key;
      userProfileRef.child(message.sender).once("value", function(snapshot) {
        const userprofile = snapshot.val();
        displayMessage(userprofile.senderName, userprofile.Pfp, userprofile.country, message.text, message.timestamp, messageId, message.replies);
      });
    });
  })
  .catch((error) => {
    console.log(error.message);
  });

document.getElementById("sendButton").addEventListener("click", function() {
  sendMessage();
});

auth.onAuthStateChanged((user) => {
  if (user) {
    userProfileRef.child(user.uid).once("value", (snapshot) => {
      if (!snapshot.exists()) {
        const randPfp = ["/images/profileimages/data.png", "/images/profileimages/deanna.png","/images/profileimages/geordi.png","/images/profileimages/picard.png","/images/profileimages/riker.png"];

        fetch('https://geolocation-db.com/json/')
          .then(response => response.json())
          .then(data => {
            const countrycode = data.country_code;
            const randomm = randPfp[Math.floor(Math.random() * randPfp.length)]

            userProfileRef.child(user.uid).set({
              Pfp: randomm,
              senderName: "Anonymous",
              country: countrycode
            }).then(() => {
              document.getElementById("displayname").value = "Anonymous";
              document.getElementById("pfpImage").src = randomm;
            }).catch((error) => {
              console.log(error.message);
            });
          })
          .catch(error => {
            console.error('Error fetching country code:', error);
          });
      } else {
        const userProfile = snapshot.val();
        document.getElementById("displayname").value = userProfile.senderName || "Anonymous";
        document.getElementById("pfpImage").src = userProfile.Pfp || "/images/profileimages/data.png";
      }
    });
  }
});


const fileInput = document.getElementById("file");
const pfpImage = document.getElementById("pfpImage");
const changeddisplayname = document.getElementById("displayname")

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  const formData = new FormData();
  formData.append("image", file);

  fetch("https://api.imgur.com/3/image/", {
    method: "POST",
    headers: {
      Authorization: "Client-ID 6db47bd7029562d",
    },
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      const imageUrl = data.data.link;
      userProfileRef.child(auth.currentUser.uid).update({
        Pfp: imageUrl,
      });
      pfpImage.src = imageUrl;
    })
    .catch((error) => {
      console.error("Error uploading image:", error);
    });
});

changeddisplayname.addEventListener("change", (event) => {
  userProfileRef.child(auth.currentUser.uid).update({
    senderName: changeddisplayname.value.trim()
  });
});


function sendMessage() {
  const message = document.getElementById("message").value.trim();

  if (message !== "") {
    const user = auth.currentUser;
    const timestamp = Date.now();
    const formattedMessage = message.replace(/\n/g, "<br>") + "<br>";

    chatRef.push().set({
      sender: user.uid,
      text: formattedMessage,
      timestamp: timestamp,
      replies: [],
    });
          
    }

    document.getElementById("message").value = "";
    location.reload()
  }


  function toggleReply(messageId) {
    const replyInput = document.getElementById(`replyInput_${messageId}`);
    replyInput.style.display = replyInput.style.display === "none" ? "block" : "none";
  }
  
  function sendReply(messageId) {
    const user = auth.currentUser;
    const replyText = document.getElementById(`replyText_${messageId}`).value.trim();
    const timestamp = Date.now();

    if (replyText !== "") {
        chatRef.child(messageId).child("replies").push().set({
            sender: user.uid,
            text: replyText,
            timestamp: timestamp,
        });

        document.getElementById(`replyText_${messageId}`).value = "";
        toggleReply(messageId);
    }
}




function timeSince(date) {

  var seconds = Math.floor((new Date() - date) / 1000);

  var interval = seconds / 31536000;

  if (interval > 1) {
    return Math.floor(interval) + " years";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes";
  }
  return Math.floor(seconds) + " seconds";
}
function displayMessage(senderName, Pfp, country, text, timestamp, messageId, replies) {
  const chat = document.getElementById("chat");
  const messageElement = document.createElement("div");
  var d = new Date(timestamp).toLocaleString();
  var mincey = timeSince(new Date(timestamp));
  messageElement.innerHTML = `
    <div style="background-color: black; margin: 10px 0; padding:10px">
      <div style="display:flex; flex-direction: row;">
        <div style="width:50px"><img src="${Pfp}" style="width: 50px; height: 50px; margin: 0; margin-right: 10px; object-fit:cover;"></div>
        <div style="width:820px; margin-left:10px">
          <strong>${senderName} <img src="https://flagsapi.com/${country}/shiny/16.png" style="margin:0; height:16px"></strong><small style="float:right;">${mincey} ago</small>
          <div style="margin-top:5px">${text}</div>
          <button onclick="toggleReply('${messageId}')" style="margin-top:10px; width: 50px; height: 20px; border:none; background-color:#555555; color:white; text-align:center">reply</button>
        </div>
      </div>
    </div>
    <div id="replyInput_${messageId}" style="display:none;">
      <textarea type="text" id="replyText_${messageId}" placeholder="${messageId}"></textarea>
      <button onclick="sendReply('${messageId}')">Send</button>
    </div>
  `;
  chat.insertBefore(messageElement, chat.firstChild);

  if (replies && Object.keys(replies).length > 0) {
    const repliesElement = document.createElement("div");
    repliesElement.style = "margin-left: 60px;";

    Object.values(replies).forEach(reply => {
      userProfileRef.child(reply.sender).once("value", function(snapshot) {
        const senderProfile = snapshot.val();
        const replyElement = document.createElement("div");
        var mincey = timeSince(new Date(reply.timestamp));
        replyElement.innerHTML = `
          <div style="background-color: black; margin: 10px 0; padding:10px">
            <div style="display:flex; flex-direction: row;">
              <div style="width:50px"><img src="${senderProfile.Pfp}" style="width: 50px; height: 50px; margin: 0; margin-right: 10px; object-fit:cover;"></div>
              <div style="width:820px; margin-left:10px">
                <strong>${senderProfile.senderName} <img src="https://flagsapi.com/${senderProfile.country}/shiny/16.png" style="margin:0; height:16px"></strong><small style="float:right;">${mincey} ago</small>
                <div style="margin-top:5px">${reply.text}</div>
              </div>
            </div>
          </div>
        `;
        repliesElement.appendChild(replyElement);
      });
    });

    messageElement.appendChild(repliesElement);
  }
}
