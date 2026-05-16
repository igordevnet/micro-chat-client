import { inject, Injectable, signal } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';
import { SignalingPayload } from '../../shared/interfaces/signaling.payload';

@Injectable({ providedIn: 'root' })
export class CallService {
    private wsService = inject(WebSocketService);
    private auth = inject(AuthService);

    private peerConnection: RTCPeerConnection | null = null;
    
    public localStream = signal<MediaStream | null>(null);
    public remoteStream = signal<MediaStream | null>(null);
    public incomingCall = signal<SignalingPayload | null>(null);
    public activeCall = signal<boolean>(false);
    public isVideoCall = signal<boolean>(true);

    private currentTargetId: number | null = null;
    private currentChatId: string | null = null;

    private rtcConfig = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
    };

    async startCall(targetId: number, chatId: string, isVideo: boolean = true) {
        this.currentTargetId = targetId;
        this.currentChatId = chatId;
        this.isVideoCall.set(isVideo);

        await this.setupLocalMedia(isVideo);
        this.createPeerConnection();

        const offer = await this.peerConnection!.createOffer();
        await this.peerConnection!.setLocalDescription(offer);

        this.wsService.sendWebRTCSignal({
            type: 'OFFER',
            senderId: this.auth.currentUser()!.id,
            targetId: targetId,
            chatId: chatId,
            isVideo: isVideo,
            data: JSON.stringify(offer) 
        });

        this.activeCall.set(true);
    }

    async acceptCall(isVideo: boolean = true) {
        const callData = this.incomingCall();
        if (!callData) return;

        this.currentTargetId = callData.senderId;
        this.currentChatId = callData.chatId;
        this.isVideoCall.set(isVideo);

        await this.setupLocalMedia(isVideo);
        this.createPeerConnection();

        const offer = JSON.parse(callData.data);
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);

        this.wsService.sendWebRTCSignal({
            type: 'ANSWER',
            senderId: this.auth.currentUser()!.id,
            targetId: callData.senderId,
            chatId: callData.chatId,
            isVideo: isVideo,
            data: JSON.stringify(answer)
        });

        this.incomingCall.set(null); 
        this.activeCall.set(true);
    }

    rejectCall() {
        const callData = this.incomingCall();
        if (callData) {
            this.wsService.sendWebRTCSignal({
                type: 'REJECTED',
                senderId: this.auth.currentUser()!.id,
                targetId: callData.senderId,
                chatId: callData.chatId,
                data: ''
            });
            this.incomingCall.set(null);
        }
    }

    async handleSignalingMessage(signal: SignalingPayload) {
        switch (signal.type) {
            case 'OFFER':
                this.incomingCall.set(signal);
                break;

            case 'ANSWER':
                console.log('Call accepted, setting remote answer...');
                const answer = JSON.parse(signal.data);
                await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(answer));
                break;

            case 'ICE_CANDIDATE':
                const candidate = JSON.parse(signal.data);
                await this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
                break;

            case 'HANG_UP':
            case 'REJECTED':
                console.log('Call ended by remote user.');
                this.endCall(false); 
                break;
        }
    }

    private async setupLocalMedia(video: boolean) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: video, audio: true });
            this.localStream.set(stream);
        } catch (error) {
            console.error('Error accessing media devices.', error);
        }
    }

    private createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.rtcConfig);

        const local = this.localStream();
        if (local) {
            local.getTracks().forEach(track => this.peerConnection!.addTrack(track, local));
        }

        this.peerConnection.ontrack = (event) => {
            console.log('Received remote track!');
            this.remoteStream.set(event.streams[0]);
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.currentTargetId && this.currentChatId) {
                this.wsService.sendWebRTCSignal({
                    type: 'ICE_CANDIDATE',
                    senderId: this.auth.currentUser()!.id,
                    targetId: this.currentTargetId,
                    chatId: this.currentChatId,
                    data: JSON.stringify(event.candidate)
                });
            }
        };
    }

    endCall(notifyRemote: boolean = true) {
        if (notifyRemote && this.currentTargetId && this.currentChatId) {
            this.wsService.sendWebRTCSignal({
                type: 'HANG_UP',
                senderId: this.auth.currentUser()!.id,
                targetId: this.currentTargetId,
                chatId: this.currentChatId,
                data: ''
            });
        }

        this.localStream()?.getTracks().forEach(track => track.stop());
        this.peerConnection?.close();
        
        this.peerConnection = null;
        this.localStream.set(null);
        this.remoteStream.set(null);
        this.activeCall.set(false);
        this.incomingCall.set(null);
        this.currentTargetId = null;
        this.currentChatId = null;
    }
}