import constants from "../../config";

const getList = (listID) => {
    return new Promise(function(resolve, reject) {
        const opts = {
            method: "GET",
            headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                    }
        };

        fetch(constants.ADMINAPIURL + "/list/" + listID, opts)
        .then((response) => response.json())
        .then((data) => {
            if (data.error) throw new Error(data.error);
            if (data) { 
                resolve(data)
                return;
            }
            reject(data);
        }).catch((error)=>{
            reject(error.message);
        });
    });
};

const createList = (list) => {

    return new Promise(function(resolve, reject) {
        const opts = {
            method: "POST",
            headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                    },
            body: JSON.stringify(list)
        };

        fetch(constants.ADMINAPIURL + "/lists", opts)
        .then((response) => response.json())
        .then((data) => {
            if (data.error) throw new Error(data.error);
            if (data) { 
                console.log("[list-service] created list",data);
                resolve(data)
                return;
            }
            reject(data);
        }).catch((error)=>{
            reject(error.message);
        });
    });
};



const updateList = (list) => {
    console.log("[list-service] UpdateList", list);
    return new Promise(function(resolve, reject) {
        const opts = {
            method: "PUT",
            headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                    },
            body: JSON.stringify(list)
        };

        fetch(constants.ADMINAPIURL + "/list/" + list.id, opts)
        .then((response) => response.json())
        .then((data) => {
            if (data.error) throw new Error(data.error);
            if (data) { 
                console.log("[list-service] update",data);
                resolve(data)
                return;
            }
            reject(data);
        }).catch((error)=>{
            reject(error.message);
        });
    });
};

const deleteList = (listID) => {

    return new Promise(function(resolve, reject) {
        const opts = {
            method: "DELETE",
            headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                    }
        };

        fetch(constants.ADMINAPIURL + "/list/" + listID, opts)
        .then((response) => response.json())
        .then((data) => {
            if (data.error) throw new Error(data.error);
            if (data) { 
                resolve(data)
                return;
            }
            reject(data);
        }).catch((error)=>{
            reject(error.message);
        });
    });
};

export default {
    getList,
    createList,
    updateList,
    deleteList
};