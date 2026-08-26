#!/usr/bin/env python
"""SFTP helper: copy a file from the Pi5 to local. Usage: python pi5_sftp.py <remote> <local>"""
import sys, paramiko

HOST = "192.168.100.51"
USER = "ba4b0d"
PASS = "Adadep@1625"

def get(remote, local):
    t = paramiko.Transport((HOST, 22))
    t.connect(username=USER, password=PASS)
    sftp = paramiko.SFTPClient.from_transport(t)
    sftp.get(remote, local)
    sftp.close()
    t.close()
    print(f"downloaded {remote} -> {local}")

if __name__ == "__main__":
    get(sys.argv[1], sys.argv[2])