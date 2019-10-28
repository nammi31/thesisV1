const express = require('express')
var multer  = require('multer')
   , cp = require('child_process')
   , ursa = require('ursa')
   , msg

const path = require('path');
var upload = multer({ dest: 'uploads/' })
const app = express()
var upload = multer()     

const bodyParser = require('body-parser')

// define what app will use newly added
app.use(express.json());
app.use(express.static(__dirname + "/public"));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended: false
}));

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')


//set network configuration
const { FileSystemWallet, Gateway, X509WalletMixin } = require('fabric-network');
  const fs = require('fs');
  const ccpPath = path.resolve(__dirname, '..', '..', 'basic-network', 'connection.json');
  const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
  const ccp = JSON.parse(ccpJSON);

app.get('/', function(req,res){
  res.render('index')
})


app.get('/register', (req,res)=>{
  res.render('form')
})

app.post('/register', async (req, res) => {

        var username = req.body.username 
        var  msp_id = req.body.msp_id
        var affiliation = req.body.affiliation
        var password = req.body.password
        console.log('welcome '+ username +  ' msp_id : ' + msp_id+ ' affiliation : ' + affiliation + ' password : ' + password )
       
        
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
                        console.log('Successfully registered and enrolled user '+username+' and imported it into the wallet');
                        res.send('Successfully registered and enrolled user '+username)
                        
                        //  /******** now I have to send username, pubkey,cert to chaincode *********/
                        //  const privkey =  enrollment.key.toBytes()
                        //  const cert = enrollment.certificate
                        //  // But how to get public key???? 
                        //  //one way -> reading from wallet path ..That's why I am using 1.4 version
                        //  cp.exec( 'cat wallet/'+username+'/*-pub' , function (err, pubKey, stderr) {
                        //       console.log('pubkey: ',pubKey)
                        //       await contract.submitTransaction('register', username,pubkey, cert );
                        //       console.log('Transaction has been submitted');
      
                        //       // Disconnect from the gateway.
                        //       await gateway.disconnect();
                        //  })
               

                    } catch (error) {
                        console.error('Failed to register user' + username+' : ${error} ');
                        process.exit(1);
                    }
                }

                main();
            

              
  })


  // login
  app.get('/login', (req,res)=>{
      res.render('login')
  })

  app.post('/login', (req,res)=>{

    var username = req.body.username
    var password = req.body.password

    
    msg = 'username: '+username+'password: '+password 
    console.log('msg: ',msg)

    

    res.render('login')
  })

  //after uploading private key file
app.post('/upload', upload.single('keyFile'), function (req, res, next) {

      buf = req.file.buffer
      data = buf.toString('utf8')
      console.log(data);
      let privkey = ursa.createPrivateKey(buf);
      let encryptedMsg = privkey.privateEncrypt(msg, 'utf8', 'base64'); 
      console.log('encrypted message: ', encryptedMsg)

       //load public key from chaincode database
    //    async function main() {
    //     try {
    
    //         // Create a new file system based wallet for managing identities.
    //         const walletPath = path.join(process.cwd(), 'wallet');
    //         const wallet = new FileSystemWallet(walletPath);
    //         console.log(`Wallet path: ${walletPath}`);
    
    //         // Check to see if we've already enrolled the user.
    //         const userExists = await wallet.exists(username);
    //         if (!userExists) {
    //             console.log('An identity for the user "user1" does not exist in the wallet');
    //             console.log('Run the registerUser.js application before retrying');
    //             return;
    //         }
    
    //         // Create a new gateway for connecting to our peer node.
    //         const gateway = new Gateway();
    //         await gateway.connect(ccp, { wallet, identity: username, discovery: { enabled: false } });
    
    //         // Get the network (channel) our contract is deployed to.
    //         const network = await gateway.getNetwork('mychannel');
    
    //         // Get the contract from the network.
    //         const contract = network.getContract('fabcar');
    
    //         // send request to get public key of user
    //         /****** have to write getPubKey() function in chaincode */
    //         const result = await contract.evaluateTransaction('getPubKey',username);
    //         console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
    
    //     } catch (error) {
    //         console.error(`Failed to evaluate transaction: ${error}`);
    //         process.exit(1);
    //     }
    // }
    
    // main();
     
    // //verify user signature after getting pubKey
    // // if pubKey is not in buffer form convert it 
    // let pubkey = ursa.createPublicKey(buf);
    // let decryptedMsg = pubkey.publicDecrypt(encryptedMsg, 'base64', 'utf8');
    
    // if (decryptedMsg == msg){
    //   //signature Valid
    // }
    // otherwise not

})

app.listen(3000, () => {
    console.log(`App running at http://localhost:3000`)
  })
  