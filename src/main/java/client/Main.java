package client;

import rmi.server.MessengerService;

import java.rmi.NotBoundException;
import java.rmi.RemoteException;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

public class Main {

    public static void main(String[] args) throws NotBoundException, RemoteException {

        Registry registry = LocateRegistry.getRegistry(1000);
        MessengerService server = (MessengerService) registry
                .lookup("MessengerService");
        String responseMessage = server.sendMessage("Client Message");

        System.out.println(responseMessage);

    }
}
