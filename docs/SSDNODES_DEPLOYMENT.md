# Tyaprover Deployment Guide for SSDNodes

This guide outlines the steps to deploy Tyaprover to an SSDNodes VPS, specifically addressing environments with nested virtualization enabled.

## Prerequisites

*   **SSDNodes VPS**: A VPS running Ubuntu 20.04 or 22.04 LTS.
*   **Root Access**: You must be able to SSH as root or a user with `sudo` privileges.
*   **Domain**: A valid domain name pointing to your VPS IP address (e.g., `captain.yourdomain.com`).
*   **Nested Virtualization**: This guide assumes nested virtualization is enabled (see verification steps below).

## 1. Verify Nested Virtualization

If you intend to run virtual machines (VMs) *inside* your Tyaprover/CapRover containers or alongside them, you need to verify that your VPS supports nested virtualization (KVM).

Run the following command on your VPS:

```bash
ls -l /dev/kvm
```

**Expected Output:**
You should see something like:
```
crw-rw---- 1 root kvm 10, 232 Oct 25 10:00 /dev/kvm
```

**Troubleshooting:**
*   If you see `No such file or directory`, nested virtualization might not be enabled.
*   Try loading the KVM module:
    ```bash
    sudo modprobe kvm
    sudo modprobe kvm-intel  # For Intel CPUs
    # or
    sudo modprobe kvm-amd    # For AMD CPUs
    ```
*   If `modprobe` fails or `/dev/kvm` is still missing, you may need to contact SSDNodes support to enable nested virtualization for your instance.

**Note:** Standard Tyaprover/CapRover usage (Docker containers) **does not** require nested virtualization. It is only needed if you plan to run KVM-based VMs inside your VPS.

## 2. Firewall Configuration

Ensure the following ports are open. SSDNodes usually provides a clean slate, but if `ufw` is active:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 7946/tcp
sudo ufw allow 7946/udp
sudo ufw allow 4789/udp
sudo ufw allow 2377/tcp
sudo ufw enable
```

## 3. Deployment

We will use the standard deployment script, which handles Docker installation and CapRover setup.

1.  **Clone the Repository** (or copy the files):
    ```bash
    git clone <your-repo-url> tyaprover
    cd tyaprover
    ```

2.  **Configure Deployment**:
    Edit `deploy-config.env` with your settings:
    ```bash
    nano deploy-config.env
    ```
    Set `CAPTAIN_ROOT_DOMAIN`, `CAPTAIN_PASSWORD`, etc.

3.  **Run the Script**:
    ```bash
    chmod +x deploy-tyaprover.sh
    ./deploy-tyaprover.sh
    ```

## 4. Post-Deployment Checks

1.  **Access CapRover**: Open `https://captain.yourdomain.com` in your browser.
2.  **Login**: Use the password you set in `deploy-config.env` or the default one printed by the script.
3.  **MCP Server**: The script sets up the MCP server as a systemd service (`tyaprover-mcp`). Check its status:
    ```bash
    sudo systemctl status tyaprover-mcp
    ```

## 5. Connecting Claude Desktop (The Client)

Since Tyaprover runs on a remote VPS, you need to configure your local Claude Desktop app to communicate with it. The most secure way is to use SSH to execute the MCP server command remotely.

1.  **Open Configuration**:
    On your local machine (Mac or Windows), open the Claude Desktop config file:
    *   Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2.  **Add Server Configuration**:
    Add the `tyaprover` server. Replace `YOUR_USER` and `YOUR_VPS_IP` with your actual SSH login details.

    ```json
    {
      "mcpServers": {
        "tyaprover": {
          "command": "ssh",
          "args": [
            "YOUR_USER@YOUR_VPS_IP",
            "node",
            "/home/toowired/ACTIVE/Tyaprover/mcp-server/build/index.js"
          ]
        }
      }
    }
    ```

    *Note: Verify the path `/home/toowired/ACTIVE/Tyaprover/mcp-server/build/index.js` matches where you installed the repo on your VPS. If you cloned it to `/root/tyaprover`, adjust the path accordingly.*

3.  **SSH Key Authentication**:
    Ensure you have set up SSH key authentication so you can log in without a password prompt. Claude Desktop cannot handle password prompts.
    *   Test it: Run `ssh YOUR_USER@YOUR_VPS_IP "echo success"` in your terminal. If it asks for a password, you need to configure `ssh-copy-id`.

## 6. Using Nested Virtualization (Optional)

If you verified `/dev/kvm` is present, you can run KVM-accelerated workloads.

**Example: Running a VM inside Docker**
To use KVM inside a Docker container (e.g., for an AI agent sandbox), you must pass the device to the container:

```bash
docker run -it --device=/dev/kvm --cap-add NET_ADMIN qemux/qemu-docker
```

Or in your `docker-compose.yml`:

```yaml
services:
  vm-agent:
    image: qemux/qemu-docker
    devices:
      - /dev/kvm
    cap_add:
      - NET_ADMIN
```

## Support

For issues specific to the VPS hardware or networking, contact SSDNodes support. For Tyaprover issues, check the `mcp-server` logs or CapRover dashboard.
