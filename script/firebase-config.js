// Centralized Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCuiz8DzyxHgSztWWBTJNIl008cdweQxbo",
  authDomain: "wallet-830a8.firebaseapp.com",
  databaseURL: "https://wallet-830a8-default-rtdb.firebaseio.com",
  projectId: "wallet-830a8",
  storageBucket: "wallet-830a8.appspot.com",
  messagingSenderId: "624961085079",
  appId: "1:624961085079:web:b553e659d0de80c3dcd3d2"
};

// Initialize Firebase and make the database reference available to other scripts
firebase.initializeApp(firebaseConfig);
const db = firebase.database();