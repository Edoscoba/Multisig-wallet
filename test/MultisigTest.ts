import { Multisig__factory } from './../typechain-types/factories/contracts/Multisig__factory';
import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("Multisig Contract", function () {
  let multisig, wallet, token, owner1, owner2, owner3, owner4, nonOwner;
  
  const initialQuorum = 3;

  const Amount = ethers.parseEther("100");
  
  const transferAmount = ethers.parseEther("10000");


  async function deployToken() {
    // Contracts are deployed using the first signer/account by default
    [owner1, owner2, owner3, owner4, nonOwner] = await hre.ethers.getSigners();
    //  Deploying ERC20 20 here
    const Token = await hre.ethers.getContractFactory("MyToken");
    token = await Token.deploy();
    return { token };
  }

  async function deployMultisig() {
    // Deploying Multisig contract
    const { token } = await loadFixture(deployToken);
    let [owner1, owner2, owner3, owner4, nonOwner] = await hre.ethers.getSigners();
    multisig = await hre.ethers.getContractFactory("Multisig");
    wallet = await multisig.deploy(initialQuorum, [owner1.address, owner2.address, owner3.address, owner4.address]);

    await token.transfer(owner1.address, transferAmount);
      // expect(await token.balanceOf(owner1.address)).to.equal(transferAmount);

      // Approve the multisig contract to spend tokens from owner1
      await token.connect(owner1).approve(wallet, transferAmount);

      // Transfer tokens from owner1 to the wallet contract
      await token.connect(owner1).transfer(wallet, transferAmount);
      expect(await token.balanceOf(wallet)).to.equal(transferAmount);

      // Call the transfer function in the wallet contract
      await wallet.connect(owner1).transfer(transferAmount, owner1.address, token);

    return { wallet, owner1, owner2, owner3, owner4, nonOwner, token };
      
  }
  
  describe("Deployment", function () {
    it("Should set the correct quorum and valid signers", async function () {
      const { owner1, owner2, owner3, owner4, wallet } = await loadFixture(deployMultisig);

      expect(await wallet.quorum()).to.equal(initialQuorum);
    });
    it('should check if the number of valid signers is correctly set', async function () {
      const { wallet } = await loadFixture(deployMultisig);

      expect(await wallet.noOfValidSigners()).to.equal(4);
    });

    it('should check if the valid signers are true', async function () {
      const { wallet, owner1, owner2, owner3, owner4, nonOwner } = await loadFixture(deployMultisig);

      expect(await wallet.isValidSigner(owner1)).to.be.true;
      expect(await wallet.isValidSigner(owner2)).to.be.true;
      expect(await wallet.isValidSigner(owner3)).to.be.true;
      expect(await wallet.isValidSigner(owner4)).to.be.true;
      expect(await wallet.isValidSigner(nonOwner)).to.be.false;
       
    });
    

  });

  describe("transfer", function () {
    it("Should revert if it is an invalid signer", async function () {
      const { wallet, owner1, owner2, owner3, owner4, nonOwner, token } = await loadFixture(deployMultisig);
       
    
      await expect(wallet.connect(nonOwner).transfer(Amount, owner4.address, token)).to.be.revertedWith("invalid signer");
   
    });

    it("Should allow a valid signer to submit transaction ", async function () {
      const { wallet, owner1, owner2, owner3, owner4, nonOwner, token } = await loadFixture(deployMultisig);
      
      await wallet.connect(owner1).transfer(Amount, owner1, token);
      // await expect(wallet.connect(owner2).transfer(Amount, owner2.address, token.address));

   
    });



    it("Should revert if amount is zero", async function () {
      const { wallet, owner1, owner2, owner3, owner4, nonOwner, token } = await loadFixture(deployMultisig);
       
      const amount = ethers.parseEther("0");
      await expect(wallet.connect(owner1).transfer(amount, owner4.address, token)).to.be.revertedWith("can't send zero amount");
   
    });

    it('Should revert if recipient address is zero', async () => {
      const { wallet, owner1, owner2, owner3, owner4, nonOwner, token } = await loadFixture(deployMultisig);
      const amount = ethers.parseEther("100");
      
      await expect(wallet.connect(owner1).transfer(amount, "0x0000000000000000000000000000000000000000", token))
      
    
    });

    it('Should fail if token  is zero address', async () => {
      const { wallet, owner1 } = await loadFixture(deployMultisig);

      const amount = ethers.parseEther("100");

      await expect(wallet.connect(owner1).transfer(amount, owner1.address, "0x0000000000000000000000000000000000000000")).to.revertedWith("address zero found");
      
    });
    
    describe('Transaction approval', async () => {
      it('It should revert if the addres balance is insufficient', async () => {
        const { wallet, owner1 } = await loadFixture(deployMultisig);
        const amount = ethers.parseEther("9000000");

        await expect(wallet.connect(owner1).transfer(amount, owner1.address, token)).to.revertedWith("insufficient funds");
        
      });

      it('it should fail if transaction already completed', async () => {
         const { wallet, owner1, owner2, owner3, owner4, nonOwner, token } = await loadFixture(deployMultisig);
        await wallet.connect(owner1).approveTx(1);

        await expect(wallet.connect(owner1))
        
        
      });
      
      
      
    });
    
    
    
    
  });

  describe("appoveTx", function () {
    it("Should check if it is  the valid transaction", async function () {
      const { owner1, owner2, owner3, owner4, wallet } = await loadFixture(deployMultisig);
    
      const transactions = await wallet.transactions(0);
      await expect(transactions.id).to.equal(0);
      
    });
  
  });

});
