# Borealis #

## Message from Kw ##

Hi, KwTheDsGuy / JakubKwantowy here.  
This was an older project before I made 9x.  
This is an (almost) unmodified upload of the original server.  
A lot of the things here influenced the way I made the v7 protocol and server.

## Anyways ##

Borealis is a custom server for Aurorachat.

It's modular in design and implements V4, V6 and X1.

## Running the server ##

First install dependencies with npm.

```bash
npm i
npm audit fix
```

Then set up a .env file.  
Borealis provides an example config in `.env.sample`.  
Copy it to `.env` and edit it to your liking.

Now you can start the server with

```bash
npm run start
```

You should see something like this in your terminal:

```txt
> auc-borealis@0.1.0 start
> node .

Borealis Server  Copyright (C) 2026  Jakub Kwantowy
This program comes with ABSOLUTELY NO WARRANTY.
This is free software, and you are welcome to redistribute it
under certain conditions; check the included 'LICENSE' file for details.

Loading users
Loading IP log
Loading IP ban list
Loading ban list
Done
Web server live
X1 Server live on port 4050
TCP V6 Server live on port 3033
HTTP V6 Server live on port 6767
HTTP V4 Server live on port 3072
TCP V4 Server live on port 4040
```

This means that the server is running.

Note: On first boot, you will see a warning about users not being able to be loaded.  
This is normal and should be ignored.

## V6 Spec ##

## X1 Spec ##
