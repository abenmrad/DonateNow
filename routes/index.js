var mongoose = require('mongoose');
var Project = mongoose.model('Project');
var Donation = mongoose.model('Donation');
var Writer = mongoose.model('Writer');
var Session = mongoose.model('Session');
var config = require('../config');

/*
 * GET home page.
 */

exports.ondonation = function(){}; //On "new donation" event handler. To be catched by socket.io

exports.index = function(req, res){
	Project.find().sort({projectNumber: 'asc'}).exec(function(err, projects){
		if (err){
			console.log('Error while getting projects :\n' + JSON.stringify(err));
			res.status(500).send('Internal error');
			return;
		}
		//Summing up all the donations already in the system, to let it be part of the rendered page
		Donation.find(function(err, donations){
			if (err){
				console.log('Error while getting donations :\n' + JSON.stringify(err));
				res.status(500).send('Internal error');
				return;
			}
			//Copying projects to an other array, cuz it seems that mongoose don't allow to set fields that are not part of the data model
			var projectsCopy = [];
			for (var i = 0; i < projects.length; i++){
				projectsCopy[i] = {};
				projectsCopy[i].projectNumber = projects[i].projectNumber;
				projectsCopy[i].name = projects[i].name;
				projectsCopy[i].shareSize = projects[i].shareSize;
				projectsCopy[i].currency = projects[i].currency;
				projectsCopy[i].total = 0;
				projectsCopy[i].numShares = 0;
			}
			for (var i = 0; i < donations.length; i++){
				projectsCopy[donations[i].projectNumber].total += donations[i].shares * projectsCopy[donations[i].projectNumber].shareSize;
				projectsCopy[donations[i].projectNumber].numShares += donations[i].shares;
			}
			console.log('Projects state:\n' + JSON.stringify(projectsCopy));
			res.render('index', { title: 'DonateNow', projects: projectsCopy, beneficiaryName: config.beneficiaryName });
		});
	});
};

exports.donationPage = function(req, res){
	//Check for cookies later on
	Project.find(function(err, projects){
		if (err){
			console.log('Error while getting projects :\n' + JSON.stringify(err));
			res.status(500).send('Internal error');
			return;
		}
		res.render('donate', {title: 'Donation', projects: projects});
	});
};

exports.saveDonation = function(req, res){
	var projectNumber = Number(req.body.projectNumber);
	var donorNumber = Number(req.body.donorNumber);
	var numShares = Number(req.body.numShares);
	Project.findOne({projectNumber: projectNumber}, function(err, project){
		if (err){
			console.log('Error while saving the donation:\n' + JSON.stringify(err));
			res.status(500).send('Erreur : la donation n\'a pas pu être sauvegardée');
		}
		if (project){
			var total = numShares * project.shareSize;
			var newDonation = new Donation({
				donorNumber: donorNumber,
				projectNumber: projectNumber,
				shares: numShares,
				total: total
			});
			newDonation.save(function(err){
				if (err){
					console.log('Error while saving the donation:\n' + JSON.stringify(err));
					res.status(500).send('Erreur : la donation n\'a pas pu être sauvegardée');
				} else {
					res.send('Donation saved');
					exports.ondonation(projectNumber, numShares, total);
				}
			});
		} else {
			res.status(400).send('Le project numero ' + projectNumber + ' n\'existe pas');
		}
	});
};