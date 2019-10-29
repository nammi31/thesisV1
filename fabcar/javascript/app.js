var express = require("express");
var app = express();
var http = require("http");
const server = http.createServer(app);
const path = require('path');
var bodyparser = require("body-parser");

var multer  = require('multer')
   , cp = require('child_process')
   , ursa = require('ursa')
   , fs = require('fs')
   , msg
// for uploading private key file
var upload = multer({ dest: 'uploads/' })
var upload = multer()
// define what app will use 
app.use(express.json());
app.use(express.static(__dirname + "/public"));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended: false
}));


// set view engine and views path for app
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')


//set network configuration
const { FileSystemWallet, Gateway, X509WalletMixin } = require('fabric-network');
const ccpPath = path.resolve(__dirname, '..', '..', 'basic-network', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);


//to show real time data changes
var io = require('socket.io')(server);


var port = process.env.PORT || 3000;
var temp = null
var humidity = null
var piID=null


// Home route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
});

//need to modify for version 1.4
app.post('/', (req, res) => {

    data = req.body
    console.log("data recieved from pi : ====================================");
    console.log(data);
    console.log('====================================');
    //res.sendFile(__dirname+"/index.html")
    if (data.temp != '') {
        temp = data.temp
        humidity = data.humidity
        piID=data.piID
    }
   // START INVOKE TX
   sync function main() {
    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            console.log('An identity for the user "user1" does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'user1', discovery: { enabled: false } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('fabcar');

        // Submit the specified transaction.
        await contract.submitTransaction('sensorData', temp, humidity,piID);
        console.log('Transaction has been submitted');

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
   // END INVOKE TX
    
})

// show register page when we go /register url
app.get('/register', (req,res)=>{
    res.render('form')
  })

 // actions after submiting registration form 
 app.post('/register', (req, res) => {

    var username = req.body.username 
    var  msp_id = req.body.msp_id
    var affiliation = req.body.affiliation
    var password = req.body.password
    //console.log('welcome '+ username +  ' msp_id : ' + msp_id+ ' affiliation : ' + affiliation + ' password : ' + password )
    var cert, pubKey;
    // NEED TO MODIFY THIS VARIABLE INSIDE MAIN FUNCTION at any cost
    let isSuccessReg = false
    
                  /*
          * Register and Enroll a user
          */
            async function main() {
                try {

                    // Create a new file system based wallet for managing identities.
                    const walletPath = path.join(process.cwd(), 'wallet');
                    const wallet = new FileSystemWallet(walletPath);
                    console.log(`Wallet path: ${walletPath}`);

                    // Check to see if we've already enrolled the user.
                    const userExists = await wallet.exists(username);
                    if (userExists) {
                        console.log('An identity for the user '+username+' already exists in the wallet');
                        return;
                    }

                    // Check to see if we've already enrolled the admin user.
                    const adminExists = await wallet.exists('admin');
                    if (!adminExists) {
                        console.log('An identity for the admin user "admin" does not exist in the wallet');
                        console.log('Run the enrollAdmin.js application before retrying');
                        return;
                    }

                    // Create a new gateway for connecting to our peer node.
                    const gateway = new Gateway();
                    await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: false } });

                    // Get the CA client object from the gateway for interacting with the CA.
                    const ca = gateway.getClient().getCertificateAuthority();
                    const adminIdentity = gateway.getCurrentIdentity();

                    // Register the user, enroll the user, and import the new identity into the wallet.
                    const secret = await ca.register({ affiliation: affiliation, enrollmentID: username, role: 'client' ,enrollmentSecret: password  }, adminIdentity);
                    const enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret });
                    const userIdentity = X509WalletMixin.createIdentity(msp_id, enrollment.certificate, enrollment.key.toBytes());
                    wallet.import(username, userIdentity);
                    
                    isSuccessReg = true
        
                    console.log('Successfully registered and enrolled user '+username+' and imported it into the wallet');
                    res.send('Successfully registered and enrolled user '+username)
                    
                 
                } catch (error) {
                    console.error('Failed to register user ' + username+' : ${error} : '+error);
                    process.exit(1);
                }
            }

            main();

            
            if (isSuccessReg == true){
                 //  registration is successful
                    // READ CERT,PUBLIC KEY FROM USER'S WALLET 
                    var buf = fs.readFileSync('wallet/'+username+'/'+username)   //read cert file
                    var pubfileName =  JSON.parse(buf.toString()).enrollment.signingIdentity //find pubkeyfilename 
                    buf = fs.readFileSync('wallet/'+username+'/'+pubfileName+'-pub')

                    pubKey = buf.toString()
                    userId = username
                    cert =  enrollment.certificate
                    console.log('userId : ',userId,'cert : ',cert,'pubkey : ',pubKey)

                     // OK Now store USER INFO  at blockchain
                   // START INVOKE TRANSACTION 
                  async function invokemain() {
                    try {
                
                        // Create a new file system based wallet for managing identities.
                        const walletPath = path.join(process.cwd(), 'wallet');
                        const wallet = new FileSystemWallet(walletPath);
                        console.log(`Wallet path: ${walletPath}`);
                
                        // Check to see if we've already enrolled the user.
                        const userExists = await wallet.exists(username);
                        if (!userExists) {
                            console.log('An identity for the user '+username+' does not exist in the wallet');
                            console.log('Run the registerUser.js application before retrying');
                            return;
                        }
                
                        // Create a new gateway for connecting to our peer node.
                        const gateway = new Gateway();
                        await gateway.connect(ccp, { wallet, identity: username, discovery: { enabled: false } });
                
                        // Get the network (channel) our contract is deployed to.
                        const network = await gateway.getNetwork('mychannel');
                
                        // Get the contract from the network.
                        const contract = network.getContract('fabcar');
                
                       // submit the tx
                        await contract.submitTransaction('storeUserInfo', userId, cert,pubKey);
                        console.log('Transaction has been submitted');
                
                        // Disconnect from the gateway.
                        await gateway.disconnect();
                
                    } catch (error) {
                        console.error(`Failed to submit transaction: ${error}`);
                        process.exit(1);
                    }
                  }
                  invokemain();
                // END INVOKE TRANSACTION

            }
           // END REGISTRATION
           // All of my task is complete 

          
})
  
// show login form when go /login url
    app.get('/login', (req,res)=>{
        res.render('login')
    })

// actions after submitting username and private key in login page  
app.post('/upload', upload.single('keyFile'), function (req, res, next) {

    // private key file
    var buf = req.file.buffer
    console.log('keyFile buffer : ',buf, 'typeof buf : ', typeof buf)
    console.log("typeof buf : ",typeof buf)
    console.log(" private key:", buf.toString('utf8') );

    var user = {
        userId : req.body.username
        password : req.body.password
        privateKey : buf.toString()
    }
    console.log('user : ', user)

    let privkey = ursa.createPrivateKey(buf);
    msg = req.body
    let encryptedMsg = privkey.privateEncrypt(msg, 'utf8', 'base64'); 
    console.log('encrypted message: ', encryptedMsg)
    // START QUERY TRANSACTION
    //load public key from Blockchain for signature verification
   async function main() {
    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists('shoumik');
        if (!userExists) {
            console.log('An identity for the user "shoumik" does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'shoumik', discovery: { enabled: false } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('fabcar');

        // send request to get public key of user
        /****** have to write getPubKey() function in chaincode */
        const result = await contract.evaluateTransaction('getUserInfo','shoumik');
        console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
        res.sendFile(__dirname + '/index.html')
            latestData();

    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        process.exit(1);
    }
}

main();
// NEED TO KEEP TRACK using cookie or variable
// //verify user signature after getting pubKey
// // if pubKey is not in buffer form convert it 
// let pubkey = ursa.createPublicKey(buf);
// let decryptedMsg = pubkey.publicDecrypt(encryptedMsg, 'base64', 'utf8');

// if (decryptedMsg == msg){
//   //signature Valid
     // res.send('login is successful')
     // res.render('profile')
// }
// otherwise not

})
  

var finalData={
    DocID:'',
    Doctype:'',
    PiID:'',
    Humidity:'',
    Temp:''
    
}
function latestData() {
    
     //do a query tx as a user
     async function main() {
      try {
  
          // Create a new file system based wallet for managing identities.
          const walletPath = path.join(process.cwd(), 'wallet');
          const wallet = new FileSystemWallet(walletPath);
          console.log(`Wallet path: ${walletPath}`);
          var username = 'shoumik'
          // Check to see if we've already enrolled the user.
          const userExists = await wallet.exists(username);
          if (!userExists) {
              console.log('An identity for the user "user1" does not exist in the wallet');
              console.log('Run the registerUser.js application before retrying');
              return;
          }
  
          // Create a new gateway for connecting to our peer node.
          const gateway = new Gateway();
          await gateway.connect(ccp, { wallet, identity: username, discovery: { enabled: false } });
  
          // Get the network (channel) our contract is deployed to.
          const network = await gateway.getNetwork('mychannel');
  
          // Get the contract from the network.
          const contract = network.getContract('fabcar');
  
          // Evaluate the specified transaction.
          //const result = await contract.evaluateTransaction('getpIData','piID1','ownerID');
          const result = await contract.evaluateTransaction('lastData');
          console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
          finalData=JSON.parse(result)
          console.log('====================================');
          console.log("finalData ",finalData);
          console.log('====================================');
            io.emit('data',finalData)
  
      } catch (error) {
          console.error(`Failed to evaluate transaction: ${error}`);
          process.exit(1);
      }
  }
  
  main();
    
  
}


function showIP() {
    var os = require('os');
    var ifaces = os.networkInterfaces();

    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;

        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }

            if (alias >= 1) {
                // this single interface has multiple ipv4 addresses
                console.log(ifname + ':' + alias, iface.address);
            } else {
                // this interface has only one ipv4 adress
                console.log(ifname, iface.address);
            }
            ++alias;
        });
    });

}
io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    })
});


showIP()
server.listen(port, err => {
    if (err) {
        throw err
    } else {
        console.log('server started on port :3000');
    }

})