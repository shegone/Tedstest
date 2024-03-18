import React, { useEffect, useState, useRef } from 'react';

/**
 * v0 by Vercel.
 * @see https://v0.dev/t/KeLSEuc92jy
 */
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { siteConfig } from "@/config/site"
import {
  Message,
  // import as useAssistant:
  experimental_useAssistant as useAssistant,
} from 'ai/react';
import { ChatbotConfig } from '@/types';

interface ChatMessage {
  id: string;
  content: string;
  role: 'assistant' | 'user'; // Indicates whether the message is from the assistant or the user
  timestamp: string; // Represents the time the message was sent, typically in milliseconds since the Unix epoch
  // Additional properties if needed
}

export default function ChatBox() {
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<ChatbotConfig>()
  const [chatbotId, setChatbotId] = useState<string>()
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isChatHistoryVisible, setIsChatHistoryVisible] = useState(false);

  const [chatMessages, setChatMessages] = useState<{ [threadId: string]: ChatMessage[] }>({}); // State variable to hold messages by threadId
  const [lastInput, setLastInput] = useState(''); // State variable to hold the last user input

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  const [selectedThreadId, setSelectedThreadId] = useState<string>("");

  const { status, messages, input, submitMessage, handleInputChange, threadId } = useAssistant({
    threadId: selectedThreadId,
    api: `${siteConfig.url}api/chatbots/${window.chatbotConfig.chatbotId}/chat`,
  });

  function handleSubmitMessage(e: any) {
    e.preventDefault();
    setLastInput(input);
    submitMessage(e);
  }

  function selectNewThreadId(newThreadId: string) {
    // Update the threadId state variable
    // This will trigger the useEffect hook to load the messages for the new thread
    // This will also trigger the useEffect hook to scroll to the bottom of the chat window
    console.log(`Selected threadId: ${newThreadId}`);
    setSelectedThreadId(newThreadId);


    //set new messages
    messages = chatMessages[newThreadId] || [];
  }

  const toggleChatHistory = () => {
    setIsChatHistoryVisible(!isChatHistoryVisible);
  }

  const toggleChatVisibility = () => {
    setIsChatVisible(!isChatVisible);
  };

  const containerRef = useRef(null);

  useEffect(() => {
    // Scroll to the bottom of the container on messages update
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;

    if (threadId || "" !== "") {
      setSelectedThreadId(threadId);
      // for all messages in the thread, add them to chatMessages state
      // validate that the message ids are not already added to the chatMessages state
      const allMessages = chatMessages[threadId] || [];
      const newMessages = messages.filter((message: Message) => {
        if (message.id === "") {
          return false;
        }
        return !allMessages.some((chatMessage: ChatMessage) => chatMessage.id === message.id);
      });
      newMessages.forEach((message: Message) => {
        addMessage(threadId, message.id, message.role, message.content);
      })
    }

  }, [messages]);

  const addMessage = (threadId: string, id: string, role: 'assistant' | 'user', newMessage: string) => {
    const messageWithTime: ChatMessage = {
      id: id,
      content: newMessage,
      timestamp: new Date().toISOString(), // Add current time
      role: role, // Update the role property to a valid value
    };
    // load messages from localstorage
    const storageChatMessages = JSON.parse(localStorage.getItem('chatMessages') || '{}');
    // merge the messages
    const mergedMessages = { ...storageChatMessages, [threadId]: [...(storageChatMessages[threadId] || []), messageWithTime] };

    localStorage.setItem('chatMessages', JSON.stringify(mergedMessages));
    // add them to chatMessages state
    setChatMessages(mergedMessages);
  };

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 640);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const id = window.chatbotConfig.chatbotId
      setChatbotId(id)

      // Fetch previous messages from storage or API
      const storedMessages = localStorage.getItem('chatMessages');
      if (storedMessages) {
        setChatMessages(JSON.parse(storedMessages));
      }

      const config = await fetch(`${siteConfig.url}api/chatbots/${id}/config`)
      const chatbotConfig: ChatbotConfig = await config.json()
      setConfig(chatbotConfig)
      setLoading(false)
    };
    init();
  }, [])

  const chatboxClassname = isMobile ? "fixed inset-0 flex flex-col" : "mr-3 flex flex-col max-w-lg min-h-[65vh] max-h-[65vh]";
  const inputContainerClassname = isMobile ? "fixed bottom-0 left-0 w-full bg-white" : "";
  const inputContainerHeight = 70; // Adjust this value based on your actual input container height

  return (
    <div className="fixed bottom-0 right-0 mb-4 z-50 flex items-end">
      {isChatVisible &&
        <Card className={chatboxClassname + " bg-white shadow-lg transform transition-transform duration-200 ease-in-out" + (isMobile ? " overflow-auto" : "")}>
          {isChatHistoryVisible &&
            <div className="transition ease-in-out delay-150  flex-grow h-full border-r-2 w-1/2 space-y-2 absolute bg-white">
              <div style={{ background: config ? config!.chatHeaderBackgroundColor : "" }} className="flex rounded-t-lg shadow justify-between items-center p-4">
                <div>
                  <Button onClick={toggleChatHistory} variant="ghost">
                    <Icons.close style={{ color: config ? config!.chatHeaderTextColor : "" }} className="h-5 w-5 text-gray-500" />
                  </Button>
                </div>
                <h3 style={{ color: config ? config!.chatHeaderTextColor : "" }} className="text-xl font-semibold">Previous conversations</h3>
              </div>
              {
                // list all last messages of each threads and put last message time on the right 
                // if messages are more than 10 chars, show only the first 10 chars
                chatMessages && Object.keys(chatMessages).map((currentMessageThreadId: string) => {
                  const lastMessage = chatMessages[currentMessageThreadId][0];

                  return (
                    <button onClick={() => selectNewThreadId(currentMessageThreadId)} key={currentMessageThreadId} className={threadId === currentMessageThreadId ? 'bg-gray-200' : '' + ' hover:bg-gray-200 border-2 p-2 rounded m-2'}>
                      <p className="text-md mb-2" >
                        {
                          lastMessage.content.length > 20 ? lastMessage.content.substring(0, 20) + '...' : lastMessage.content
                        }
                      </p>
                      <p className="text-xs text-gray-500">
                        {
                          new Date(lastMessage.timestamp).toLocaleDateString()
                        }
                      </p>
                    </button>
                  )
                })
              }
            </div>
          }
          <div style={{ background: config ? config!.chatHeaderBackgroundColor : "" }} className="flex rounded-t-lg shadow justify-between items-center p-4">
            <div>
              <Button onClick={toggleChatHistory} variant="ghost">
                <Icons.menu style={{ color: config ? config!.chatHeaderTextColor : "" }} className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
            <h3 style={{ color: config ? config!.chatHeaderTextColor : "" }} className="text-xl font-semibold">{config ? config!.chatTitle : ""}</h3>
            <div>
              <Button onClick={toggleChatVisibility} variant="ghost">
                <Icons.close style={{ color: config ? config!.chatHeaderTextColor : "" }} className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
          </div>
          <div className={"space-y-4 flex flex-row flex-grow overflow-auto custom-scrollbar"} style={{ marginBottom: isMobile ? `${inputContainerHeight}px` : '0' }} ref={containerRef}>
            <div className="space-y-4 p-4">
              <div key="0" className="flex w-5/6 items-end gap-2">
                <div className="rounded-lg bg-zinc-200 p-2" style={{ background: config ? config.chatbotReplyBackgroundColor : "" }}>
                  <p className="text-md" style={{ color: config ? config.chatbotReplyTextColor : "" }}>{config ? config!.welcomeMessage : ""}</p>
                </div>
              </div>
              {
                messages.map((message: Message) => {
                  if (message.role === "assistant") {
                    return (
                      <div key={message.id} className="flex w-5/6 items-end gap-2">
                        <div className="rounded-lg bg-zinc-200 p-2" style={{ color: config ? config.chatbotReplyTextColor : "", background: config ? config.chatbotReplyBackgroundColor : "" }}>
                          {message.content.replace(/\【\d+†source】/g, '') // Remove citation markers
                            .split('```').map((block, blockIdx) => {
                              // Check if the block is a code block or normal text
                              if (blockIdx % 2 === 1) {
                                // Render code block
                                return <pre key={blockIdx}><code>{block}</code></pre>;
                              } else {
                                // Process normal text for ** and \n
                                return block.split('\n').map((line, lineIndex, lineArray) => (
                                  <p key={`${blockIdx}-${lineIndex}`} className={`text-md ${lineIndex < lineArray.length - 1 ? 'mb-4' : ''}`}>
                                    {line.split('**').map((segment, segmentIndex) => {
                                      // Render bold text for segments surrounded by **
                                      if (segmentIndex % 2 === 1) {
                                        return <strong key={segmentIndex}>{segment}</strong>;
                                      } else {
                                        // Replace URLs with Next.js Link tags or standard <a> tags
                                        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s]+[^.])\)/g;
                                        const regularLinkRegex = /(https?:\/\/[^\s]+[^.])/g;
                                        const segments = segment.split(markdownLinkRegex);

                                        return segments.map((seg, idx) => {
                                          if (idx % 3 === 1) {
                                            // Render markdown-style link
                                            return (
                                              <a className="underline" target="_blank" key={idx} href={segments[idx + 1]}>
                                                {segments[idx]}
                                              </a>
                                            );
                                          } else if (idx % 2 === 0) {
                                            // Render normal text or regular link
                                            const normalLinkSegments = seg.split(regularLinkRegex);
                                            return normalLinkSegments.map((linkSeg, linkIdx) => {
                                              if (linkIdx % 2 === 1) {
                                                // Render regular link
                                                return (
                                                  <a className="underline" target="_blank" key={`${idx}-${linkIdx}`} href={linkSeg}>
                                                    {linkSeg}
                                                  </a>
                                                );
                                              } else {
                                                // Render normal text
                                                return <span key={`${idx}-${linkIdx}`}>{linkSeg}</span>;
                                              }
                                            });
                                          } else {
                                            // Skip the URL itself, as it's already rendered inside the Link
                                            return null;
                                          }
                                        });
                                      }
                                    })}
                                  </p>
                                ));
                              }
                            })}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={message.id} className="flex max-w-5/6 items-end gap-2 justify-end">
                        <div className="rounded-lg flex max-w-5/6 bg-blue-500 text-white p-2 self-end" style={{ background: config ? config.userReplyBackgroundColor : "" }}>
                          <p className="text-md" style={{ color: config ? config.userReplyTextColor : "" }}>{message.content}</p>
                        </div>
                      </div>
                    );
                  }
                })
              }
              {status === 'in_progress' && (
                <div className="h-8 w-5/6 max-w-md p-2 mb-8 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse" />
              )}
            </div>
          </div>
          <div className={inputContainerClassname}>
            {config?.displayBranding === true && (
              <div className="text-center text-zinc-400 text-md mb-2">
                Powered by <a href="https://www.openassistantgpt.io/">{siteConfig.name}</a>
              </div>
            )}
            <div className="border-t border-gray-200 p-2">
              <div
                className='w-full flex items-center gap-2'
              >
                <form onSubmit={handleSubmitMessage}
                  className="flex align-right items-end w-full"
                >
                  <Input
                    disabled={status !== 'awaiting_message'}
                    className="w-full border-0 text-md"
                    value={input}
                    placeholder={config ? config!.chatMessagePlaceHolder : ""}
                    onChange={handleInputChange}
                  />
                  <Button type="submit"
                    disabled={status !== 'awaiting_message'}
                    className="flex-none w-1/6 text-md"
                  >
                    {status !== 'awaiting_message' && (
                      <Icons.spinner className="mr-2 h-5 w-5 animate-spin" />
                    )}
                    {status === 'awaiting_message' && (
                      <IconSend className="mr-2 h-5 w-5 text-gray-500" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div >
        </Card >
      }
      {
        !loading && !isChatVisible &&
        <button className="ml-4 mr-4 shadow-lg border bg-white border-gray-200 rounded-full p-4" style={{ background: config ? config!.bubbleColor : "" }}
          onClick={toggleChatVisibility}>
          {!isChatVisible && <Icons.message style={{ color: config ? config!.bubbleTextColor : "" }} />}
          {isChatVisible && <Icons.close style={{ color: config ? config!.bubbleTextColor : "" }} />}
        </button>

      }
      {
        !loading && isChatVisible && !isMobile &&
        <button className="ml-4 mr-4 shadow-lg border bg-white border-gray-200 rounded-full p-4" style={{ background: config ? config!.bubbleColor : "" }}
          onClick={toggleChatVisibility}>
          {!isChatVisible && <Icons.message style={{ color: config ? config!.bubbleTextColor : "" }} />}
          {isChatVisible && <Icons.close style={{ color: config ? config!.bubbleTextColor : "" }} />}
        </button>
      }
    </div >
  )
}

function IconSend(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}
