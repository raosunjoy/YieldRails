h(error().catcionattyAllocquidiLimizes.opti   thi   {
      al(() => ervetInt   s       
  g();
    itorinrtMon.starings.monito    thiid {
    oring(): voartMonitc stpubli  /
    *vices
   serring onitotart m S**
     *

    /();
    }csg.getMetriorin.monitthisreturn         Metrics {
inssCharics(): CrooringMettMonit ge    public
     */
icsoring metrchain monitt cross- * Ge  
   /**

   e();
    }tateSnchronizateSync.sy.st thisit    awa{
    e<void> mis): Proate(izeChainStnc synchronlic asy
    pub */ins
    cross chae state aynchroniz * S
      /**}

  };
    
        dimatedYiel     est    edTime,
   timat    es           fee,
        urn {
   ret      Hours;

e * transitdRatelhourlyYi* amount = ield dYnst estimate
        co5 * 24);te / (36ldRaieualYanne = lyYieldRatst houron  c
      .05;te = 0nualYieldRaonst an
        c60); * 60 * 1000me / (matedTi= estiansitHours  const tr          
ain);
     ionChnatdestiurceChain, (soBridgeTimeateimis.estthe = imdTnst estimate      conChain);
  iotinatdesn, ceChaiount, sourFee(ameBridgeat.calculit this awa fee =      constate> {
  imse<BridgeEst'): PromiSDCtring = 'U: senokr, t: numbeamountin: string, haationCng, destinhain: strisourceCe(stimatridgeEc async getBpubli    */
    te
 imaime este fee and t* Get bridg     
    /**
    }
 }

       ;}).id olId: poolpo{ error, ', quidity poollance li to rebarror('Failed  logger.e       r) {
   tch (erro       } ca   });

 
         teAmounebalanc  r          Rate,
    utilizationpool.on: Utilizati        newd,
        ool.ilId: p     poo      
     sfully', { d succesnceol rebalaiquidity poer.info('Lgg     lo;

       ol), 3600)gify(po JSON.strinid}`,:${pool.uiditydis.set(`liqt re   awai         , pool);

.set(pool.idlsityPoothis.liquid     
       alLiquidity;nce) / totnationBala.destice, pooleBalanol.sourcMath.min(po= ionRate izatutil       pool.
     
      }    
  nceAmount;ce += rebalaourceBalan      pool.s      ount;
    nceAm rebalaBalance -=ionl.destinat   poo         e {
         } els   t;
    balanceAmounce += reonBalan.destinati        pool;
        nceAmount-= rebalace sourceBalan    pool.             {
ance)ourceBalmalSce > optialanpool.sourceB        if (  
            );
  cealaneBlSourc - optimarceBalancel.souh.abs(pooatAmount = Mt rebalancens co         * 0.5;
  uidity  totalLiqBalance =malSourceonst opti    c    
    nce;laationBa pool.destinceBalance +soury = pool.iditotalLiqu     const t     try {
       });

   pool.id Id: ool', { pooluidity plancing liqo('Rebar.infgge
        lo> {voidse<Promi: quidityPool)ol(pool: LieLiquidityPoancebale async rprivat         */
idity pool
qucific lie a speebalanc* R**
         /


    }pleted');on comy optimizatio('Liquidit  logger.inf      }

  
                 }ool);
 idityPool(planceLiquhis.reba  await t      
        ld) {hreshorebalanceTl.Rate > pooonzatiiliol.ut   if (po  ;

       ue) continsActiveif (!pool.i            ()) {
esls.valuPooquidityis.liof th(const pool      for   on');

 optimizati liquidity rting'Stager.info(      log {
  void> Promise<tion():tyAllocaizeLiquidic optim asyn
    public*/ools
     s poscation acrloiquidity almize l
     * Opti

    /**ime;
    }lT additiona baseTime +return           
   
   * 1000;0 * 60itRatio * 3e = deficdditionalTimst a con
       xLiquidity; pool.mat /= deficio atificitRt de     cons
    1000;60 *0 *  = 1t baseTime        cons {
: numbernumber), deficit: quidityPoolLiime(pool: RebalanceTtimaterivate es */
    pg
    cinalaniquidity rebtime for lEstimate *  /**
     

     };
    }      e
eTimncebalaTime: rdWaitmate        estiy,
    iquiditvailableLunt: atedAmoggessu    ',
         requiredcingity, rebalanuidliqfficient nsureason: 'I             false,
vailable:         a
    {      returnit);

  eficime(pool, debalanceTmateR.estithiseTime = rebalanc   const ity;
     Liquidilablet - ava = amounficit de     const      }


             };
    : 0TimetedWaitstima  e             
  amount,edAmount:     suggest          ilable',
 quidity avafficient lion: 'Sureas             
   ,ilable: true     ava          {
 rn etu        r{
    ) bleLiquiditynt <= availa(amou
        if        
 ationRate);ol.utilizce * (1 - poationBalanool.destindity = pailableLiqui   const av}

        };
                ime: 0
 aitT estimatedW           0,
     nt:ggestedAmou su               l found',
ooty pve liquidi acti reason: 'No               le: false,
    availab          rn {
          retu) {
    Active || !pool.is   if (!pool    
     en);
    n, toknationChaihain, destisourceCPool(iquidity this.getLconst pool =
         {eck>yChse<LiquiditC'): Proming = 'USDri: stmber, tokenunt: numotring, aionChain: sstinatstring, deChain: ility(sourceabvailkLiquidityAec chpublic async        */
ion
 dge transactor briilability fiquidity ava   * Check l    /**
      }

 null;
t(poolId) ||tyPools.geliquidin this.   retur`;
     nChain)}estinationEcosystem(dgetChai}-${this.urceChain)soystem(etChainEcos${this.gse()}-en.toLowerCaId = `${tokpoolst     con  ll {
  ool | nuyP: LiquiditC')USD = ': string tokeng,hain: strindestinationCring, n: staieChrcsoutyPool(tLiquidic geubli
    p */  l
   pooliquidityspecific      * Get /**
}

      ());
  .valuesidityPoolsthis.liqurom(ray.furn Ar      retol[] {
  idityPo: LiqudityPools()c getLiqui publi */
   ls
    idity poo* Get liqu**
     
    /   }

 ';own 'unkn      return';
  trumbiar)) return 's(chainIddeinclu21614'].'42161', '4([
        if gon';urn 'polyId)) retudes(chain0001'].incl, '87'(['13    if reum';
    urn 'ethenId)) retludes(chai155111'].inc (['1', '11     iftring {
   ): sstringm(chainId: hainEcosystee getC
    privatem
     */in ecosyst  * Get cha
     /**    }

  ystem;
tEcos descosystem !==ceEsoururn ret        );

nChaindestinatiotem(inEcosysgetCham = this.destEcosyste   const 
     n);urceChaim(sotenEcosysetChaihis.gystem = trceEcos  const sou
      ean {ng): boolriionChain: statring, destinhain: stidge(sourceCEcosystemBrossCrte isriva/
    p  *system
    cross-eco bridge is* Check if        /**
 
    }

e;ridgeTim    return b    
 }
    
    60000;idgeTime +=        br
     {))ationChainestin, durceChainBridge(soemCrossEcosyst (this.is       if0000;

 eTime = 3  let bridgr {
      : numbestring)onChain: tig, destinastrinChain: ime(sourcedgeTlateBri calcuvate */
    pri time
    rocessingbridge pte  Calcula
     * /**

       };
l)), ttionact(transON.stringifyheKey, JS.set(cacwait redis
        al = 3600;
t tt   cons}`;
     on.id:${transactiy = `bridgeeKe  const cachd> {
      e<voimis: Pronsaction)ainTrassChtion: Croion(transacransactcacheBridgeTte async     privas
     */
esk accquiction for ge transace bridCach* **
     
    /
   }
    }ion);
     ransaction(teTransactacheBridgawait this.c            
tion) {f (transac;
        ictionId)nsasaction(traeTran.getBridghist tai= awtion t transac        cons

      });teData
   data: upda            },
nsactionId: { id: tra   where   
      date({upion.ctinTransaa.crossCha.prism await this

           };
    alData)ionata, addit(updateDject.assign     Ob
       lData) {onaditiad  if (
          () };
    te new DaedAt:updat{ status, : any = atateD  const upda
      oid> {<v ): Promiseaction>
   TransrossChain<CPartialata?: onalDti   addi 
     nStatus,: CrossChai  status   tring, 
   onId: scti transa    tus(
   StaeBridgesync updat private a
   
     */ statusonnsactiridge tra* Update b*
        /*
  }
     }
   ');
   ssion addretinatd desor('Invaliw new Err  thro         
 s)) {onAddresdestinatis(request.reshers.isAdd(!et     if 
           }
ess');
 addralid source('Invw new Error   thro   {
      ress)) ddurceA(request.sos.isAddressther if (!e    }

     
      itive'); be posustt midge amounw Error('Brnehrow  t    
       = 0) {nt <ouequest.am if (r
        }
;
       ame') she be t cannotchainsination nd dest'Source arror( throw new E          
 ain) {tinationChest.des= requrceChain ==quest.sou      if (re  }

  );
      Chain}`ontiinat.destues${reqain: nation chdestiUnsupported ror(`hrow new Er           t
 ionChain)) {st.destinats(requens.haupportedChaihis.sf (!t       i
       }

  `);ceChain}urst.soin: ${requeource chaupported srror(`Uns throw new E        in)) {
   eCharc.soust.has(requeportedChainsup (!this.s   if     e<void> {
mis): ProuesteReqridgrequest: Bquest(ridgeRelidateBnc vaasyrivate     pt
     */
e requesdate bridg  * Vali /**
      
    }

 }
       ctionId });, transa{ error', e failurele bridgnd haled to('Faiger.errorlog          {
  rror) (e   } catch );

      }Id, reasonction, { transation failed'dge transacr('Bri.erro      logger          }

       
     );                reason
           onId,
     nsacti      tra            d,
  .paymentIaction trans                 ication(
  tifilureNoidgeFace.sendBrationServiotificawait this.n           {
      paymentId)ion?.sact if (tran    );
       nsactionId(traTransaction.getBridge await thisransaction =     const t

       );tus.FAILEDainStaId, CrossCh(transactionusdgeStatpdateBri.uhis twait   a
         try {{
        mise<void> ro: string): Png, reasonnId: strinsactioilure(trandleBridgeFa async havateri   */
    pure
  n failactionsdge trale briHand
     * *  /*
      }
ime;
rocessingTme + bridgePestTiceTime + d sourturnre      ;

  ain)inationChin, destChame(sourceateBridgeTialcul= this.cgTime sindgeProcesconst bri        ations;
irmconfestConfig.ockTime * dBlavgig.onfestCstTime = dnst de  co    ations;
  fig.confirmrceConckTime * soug.avgBlorceConfi sou =sourceTimest     con   }

      es
   lt 5 minutfau; // Deturn 300000       reg) {
     destConfiConfig || !ourcef (!s    iin);

    tionChadestinaains.get(.supportedChonfig = thisdestCnst        co
 in);haet(sourceCains.gChortedthis.suppg =  sourceConfinst        conumber {
: string): ionChainatng, destinhain: striTime(sourceCgeateBridic estim
    publ    */s
 n chaine betwee bridge tim * Estimate  **
  
    /    }

}));       Time
 ockhain.avgBle: cockTimavgBl  
          stnet,chain.isTeet: stnTe  is         xplorer,
 lockEain.bplorer: chockEx         bly,
   urrencveCchain.natirrency:     nativeCue,
        n.nam name: chai      d,
     in.chainI: cha chainId        > ({
   ap(chain =)).mins.values(pportedChathis.suom(ray.frreturn Ar{
        o[] ChainInfedChains(): upportgetS  public   */
  ins
   upported cha* Get s/**
       }

            }
  urn null;
 ret        });
    ionIdnsactra terror,, { transaction'e o get bridgiled trror('Faer.e     logg   or) {
    ch (err cat }    
   nsaction;
tran       retur     }

    
         saction);tion(transacridgeTranacheB this.c  await          ) {
    ction (transa  if
          ;
   })       }
   ent: trueymnclude: { pa        i
        ionId }, transactd:here: { i  w            
  ndUnique({saction.fiinTrancrossChama.rishis.pwait t a =nsactiont tra  cons        
       }
  
     cached);rse(rn JSON.pa       retu
         hed) {ac   if (c         onId}`);
nsactirabridge:${tt(`gedis.ait recached = aw      const {
         try 
     | null> {Transaction sChainPromise<Crosing): strnId: nsactioion(traeTransactetBridglic async g   pub */
  ID
    ansaction by tr* Get bridge**
     

    /;
    }ateddGenerurn yiel       rettHours;

 te * transirlyYieldRam * houurceAmountNuted = soenerat yieldG   cons
     mount);.sourceAsaction(tranerNum = NumbounturceAmonst so
        c* 24);ate / (365 eldRnualYie = anlyYieldRatur hoconst5;
        dRate = 0.0ualYiel ann     const60);
   0 * 1000 * 6 / (nsitTimes = tratransitHour      const ime();
  tTmedAt.geonfirceCction.sourransa) - te(t.getTimConfirmedAdestnsaction.e = tratransitTimt      cons   }

   rn 0;
         retu {
        onfirmedAt)destCn.tio!transacirmedAt || urceConfsotion.sac(!tran      if 
  > {se<number Promisaction):ranssChainT Croion:transacteYield(ridglculateBsync caprivate a*/
    ansit
      trridgeduring brated ield gene y* Calculate
       /**   }

   maxFee);
 ee,.min(fMathreturn        

 unt * 0.1;xFee = amoconst ma
        entage;Percamount * feee =  fenst
        co    }
02;
    .0 0ge +=entaPerc  fee        {
  ain)) nChioinatin, destourceCha(sgeidtemBrrossEcosysif (this.isC       }

  05;
       = 0.00ntage eePerce   f        
 et) {ig?.isTestndestConfsTestnet || .infig?urceCoso      if (ain);

  estinationChhains.get(dortedCs.suppConfig = thistnst de
        coceChain);ur.get(soainsortedChsuppg = this.rceConfi sou       const
 001;
 = 0.entaget feePerc        leer> {
<numbmise: Pron: string)Chaistinationing, den: strourceChair, s: numbeamountteBridgeFee(lac calcuasyn   private   */
 
   and chains on amount asedbridge fee balculate  C/**
     *   }

    
 );on.id }cti: transaIdsactiony', { tranccessfulld suon completeransacti('Bridge tinfo logger.  
     n);ransactioion(updatedTactransridgeTcacheBit this.wa   a     

   }   );
           || '0'
   tring() Amount?.toSiontination.desTransact updated             
  n.id,edTransactioat  upd           
   entId,ction.paymtedTransada   up       on(
      nNotificatieCompletioidgendBrnService.sotificatiot this.n   awai         d) {
on.paymentIedTransactidatif (up
        
        }
etion');or compl found fsaction not('Tran Errorrow new          thn) {
  ctiopdatedTransa      if (!u
  n.id);ctioction(transageTransas.getBrid thiaitction = awatedTransast upd       con<void> {
 n): PromisenTransaction: CrossChaisactiosaction(tranteBridgeTranync complerivate as */
    p   n
 latiold calcu yie with finalansactionidge trete brompl*
     * C  /*
  
   } });
 ountnAmtiodestinaaction.id, transactionId: ransirmed', { ttion confransaction tnastiger.info('De        log;

       })y
 t as anunAmostinationt: deionAmouninat  dest
          r(2, 64)}`,(16).subst().toStringdomth.ran`0x${Mash: onHasacti  destTran       e(),
   : new DatrmedAt  destConfi        
  ED, {COMPLETs.tuinSta CrossChaction.id,s(transaatuidgeSts.updateBrit thi       awated;

 eldGeneraeNum + yibridgeFeountNum - Am sourceAmount =nationconst desti      | 0);
  .bridgeFee |ansactionumber(trum = NFeeNnst bridge  co);
      mountion.sourceAr(transactNumbe = NumourceAmount     const s
   ion);sactld(traneBridgeYieis.calculatait thrated = awneldGe const yie     
  }
   
     mations));onfirn.c* destChaiBlockTime estChain.avgesolve, dsetTimeout(r=> lve omise(resoait new Pr       aw
     'test') {ENV !== nv.NODE_process.e     if (

   );NDINGATION_PETINtus.DESsChainStaCrosion.id, s(transacteStatuidgteBrdais.upawait th

        
        }n}`);tionChaiinaaction.destnsin: ${traation chated destin`Unsupporw new Error(  thro        {
   (!destChain)   if 
     ain);onChon.destinatinsacti.get(trartedChainss.suppo thiChain =const dest
        <void> {misen): ProinTransactioChan: Crossnsactiora(tnTransactionnatioirmDestiasync conf   private  */
 
    ansactionon chain trestinatirm d* Confi       /**
  }

  
  tionId });dgeTransacd, brinsaction.i: traansactionIdeted', { trration complBridge opeger.info('   log        });

 nId
    ansactio  bridgeTr        , {
  EDDGE_COMPLETRIinStatus.B, CrossChaion.idtus(transactridgeStaupdateBis.   await th
     2, 9)}`;
(36).substr(oStringdom().t${Math.ranw()}_e_${Date.nonId = `bridgactiodgeTransst bri        con    }

e));
     bridgeTimlve,out(resoetTime=> sse(resolve new Promiawait         n);
    tinationChaidesnsaction.ceChain, traction.sourime(transalateBridgeT.calcuthisime = st bridgeT     con) {
       'test'E_ENV !== .env.NODf (process
        iDING);
PENDGE_tatus.BRIainSssChro Cion.id,ansacttrtatus(eBridgeSats.updwait thi
        ase<void> {Promiaction): ChainTransion: Crossnsactn(traeOperatiocuteBridgnc exee asy    privat
   */n
  ge operatioe bridecut* Ex       /**
    }

  });
id ion.actionId: trans, { transactnfirmed'on co transactiSource('fogger.in    lo    

    }); 64)}`
    r(2,(16).substingndom().toStr${Math.rah: `0xactionHasans sourceTr        ,
   ew Date(): neConfirmedAt      sourcD, {
      ONFIRME.SOURCE_CtustahainSsCCrosid, ion.transacttatus(pdateBridgeSt this.u        awai

     }
   tions));irmaain.confurceChe * sokTimhain.avgBlocceColve, sourressetTimeout((resolve => Promisewait new            ast') {
 == 'teDE_ENV !cess.env.NOif (pro
        

        }rceChain}`);.sounsactionra${t: e chainorted sourcr(`Unsuppw new Erro      thro
      urceChain) { if (!so);
       ourceChainion.sactanstrs.get(inedChathis.supporteChain = rcconst sou  d> {
      se<voin): PromitioansacsChainTrn: Crosctioansaon(trceTransactirmSournc confiprivate asy  
       */n
ctiotransaurce chain rm sofi    * Con
 
    /**
   }
    }ge);
     rorMessa erctionId,lure(transaBridgeFais.handle thiawait   ;
         r'nown erroge : 'Unksa? error.mesr rronceof Estar in = erroerrorMessageconst            });
  ransactionId { error, t failed',ngsiction procesidge transaBrrror('gger.e  lo       rror) {
   tch (e     } ca;

   ion)(transactonTransactipleteBridgethis.comait      aw   on);
    ransactiction(ttionTransatinaonfirmDeswait this.c   a     ;
    saction)on(tranratieBridgeOpehis.execut   await t     );
    actionnsion(traeTransactconfirmSourct this.ai  aw              }

     );
   und'on not fotidge transac'Briew Error(w n    thro          ction) {
  ansa     if (!trd);
       actionIction(transransagetBridgeThis. await tion =transact     const    
     try {        {
e<void>g): PromisnId: strintioion(transacnsactgeTrarocessBridvate async p pri
   es
     */ stagleltiph muthrougn actioidge transcess br * Pro   /**
    
    }

  }      ssage}`);
 orMe{err failed: $itiatione inError(`Bridg new hrow     t';
       orown errknssage : 'Unr ? error.meanceof Erroinsterror Message = ror er       const  t });
   uesor, reqn', { erractioridge transiate b to initFailed.error('      logger      error) {
tch (       } cahainTx;

 turn crossC re           }

               });
          
   });ChainTx.id nId: crossransactio t { error,ing failed',idge process.error('Brlogger                  => {
   ch(error.id).catTxn(crossChainransactiossBridgeTroces.p   thi            
  {')= 'test_ENV !=ess.env.NODEf (proc i        
   nmentviroentest sly in  asynchronouansaction tridges br // Proces
               
        x);hainT(crossCactionanseTr.cacheBridgthis     await    

      });    }
                  IATED
    tatus.INIT CrossChainS    status:              
  tionAddress,destina request.dress:tinationAd     des           dress,
    eAduest.sourc: reqceAddress   sour               dgeFee,
  geFee: bri   brid          ,
       est.amountnt: requurceAmouso                 Chain,
   tionest.destina: requinationChain dest          
         hain,t.sourceCques rehain:ourceC     s       
        paymentId,st.tId: requemenay         p         ta: {
      da    ({
        ten.creasactionTrancrossChaiis.prisma.await th = ChainTxnst crossco         
   ;
tionChain)nauest.desti, reqsourceChainequest.amount, r(request.ateBridgeFeeulthis.calc await bridgeFee =st  con
           uest);Request(reqteBridges.validahiawait t      
         try {;

     request })n', { transactioin bridge ross-chanitiating cinfo('Ir. logge       ion> {
hainTransactossC Promise<Crquest):ridgeRee(request: BtiateBridgync iniic asubl    p/
   *ion
  actidge trans bross-chainitiate a cr In
     *   /** }

 );
   erations`ain opss-chor cros fity pooliquid} lols.length ${poializediter.info(`In   logg

            });ool);
 ool.id, p.set(pityPoolsidiqu.l    this   => {
     pool rEach(  pools.fo

            ];          }
  e: true
    isActiv        00,
      : 10000ity   maxLiquid   
          ty: 25000,Liquidimin        ,
        .8reshold: 0anceThal     reb         : 0.15,
  teRationutiliza         0,
       00nce: 250laestinationBa     d      000,
     lance: 250 sourceBa               'USDC',
  token:           2161',
    onChain: '4inati       dest        37',
 '1eChain:       sourc
          rum',olygon-arbit 'usdc-pd:     i          {
     },
                     true
ve:    isActi       
     0000,00dity: 2quiLi         max    
    50000,uidity: minLiq             0.8,
   old:eThresh    rebalanc     .2,
       onRate: 0atiiz       util       500000,
  Balance: ation     destin    
       0000,nce: 50urceBala        so       
 USDC',: 'oken       t      61',
   21n: '4Chaistination       de
         n: '1',rceChai sou        ',
       itrumeth-arb: 'usdc-     id   {
            
           },e
         ive: tru isAct            000000,
   uidity: 5     maxLiq       ,
    000010ity: Liquid        min
        old: 0.8,eshlanceThreba    r           ,
 : 0.3ionRate   utilizat         00,
    e: 10000Balancdestination          000,
      000: 1rceBalance   sou       
       'USDC',      token:    37',
      Chain: '1onstinati de          
     in: '1',ceCha    sour        n',
    polygo'usdc-eth-     id:             {
       
    ol[] = [ityPo: Liquidnst pools
        coid { votyPools():Liquidializeiniti  private        */
ations
-chain oper crosspools forty iquidi lnitialize
     * I** /  }

   
  rations`);chain opefor cross-ted chains th} supporchains.lengzed ${itialiger.info(`In log;

            })cUrl));
   rpr(chain.ProvideJsonRpc ethers.ewinId, nain.chaet(chiders.shis.prov    t      hain);
  .chainId, c.set(chainportedChains.sup  this         
 ain => {(chins.forEach    cha
        ];
     }
           true
: isTestnet               
 000,kTime: 1    avgBloc        ns: 1,
    nfirmatioco      
          can.io',lia.arbissepo 'https://er:ckExplor        blo   TH',
     y: 'EeCurrenc   nativ             000',
0000000000000000000000000000000000000ress: '0xbridgeAdd            ,
    rpc'rbitrum.io/ia-rollup.a/sepoll: 'https:/cUrrp                ,
polia' 'arbitrumSee:     nam
           4',161d: '42      chainI   {
        
           ,      }
       falset:sTestne        i
        ,me: 1000vgBlockTi         a       1,
ns: atioirm    conf           o',
 .i//arbiscantps:rer: 'htblockExplo        
        'ETH',ncy: Curre      native      ',
    00000000000000000000000000000000000000 '0x00ess:geAddr   brid        rpc',
     bitrum.io/arttps://arb1.PC_URL || 'h_RUMnfig.ARBITRcUrl: co         rp     
  um',arbitr  name: '               '42161',
chainId:        {
                       },
     ue
     trisTestnet:             ,
   : 2000ockTime  avgBl         5,
      ns:irmatio   conf           com',
  lygonscan.bai.potps://mumxplorer: 'htlockE b            ',
   ency: 'MATICCurrative n     
          0000',00000000000000000000000000000000s: '0x0000ddresridgeA   b         om',
    cvigil.catirpc-mumbai.mttps:// 'h   rpcUrl:       ,
      me: 'mumbai'          na
      ,: '80001'    chainId               {
       ,
     }         
alsesTestnet: f   i           00,
  ckTime: 20avgBlo            20,
     s:ation    confirm            ,
scan.com'lygon://po: 'httpsockExplorer          bl,
      MATIC' 'veCurrency:nati                ,
0000000'000000000000000000000000000000ss: '0x000dgeAddre        bri     m',
   c.colygon-rptps://po 'htPC_URL ||g.POLYGON_Ronfi  rpcUrl: c              gon',
me: 'poly na            
   ',ainId: '137 ch             {
     ,
                 } true
    tnet:Tes is               ,
00 120BlockTime:       avg         s: 3,
on confirmati           n.io',
    .etherscaepoliattps://slorer: 'h    blockExp            ',
: 'ETHiveCurrencynat        ,
        0000000'00000000000000000000000000x0000000ss: '0Addrege  brid              m',
icnode.coc.publa-rpm-sepolis://ethereu: 'http     rpcUrl           epolia',
me: 's        na       
 55111',d: '111chainI           
             {    },
             false
isTestnet:              000,
  lockTime: 12     avgB         
   12,irmations:   conf          an.io',
   ://etherscpser: 'httblockExplor              TH',
  cy: 'EtiveCurren        na',
        000000000000000000000000000000000000s: '0x0000bridgeAddres               v2/demo',
 lchemy.com/mainnet.g.atps://eth-|| 'htL _RPC_URREUMonfig.ETHEl: c rpcUr            
   'ethereum',  name:               '1',
 Id:chain          
              {] = [
    nConfig[ins: Chai  const cha  id {
    onfigs(): voizeChainCnitial  private i  s
     */
gurationconfichain ted por supnitialize     * I*

    /*
    }
ityPools();izeLiquidinitial    this.
    onfigs();inCizeChatial this.inis);
       disma, res(this.pritelTimeUpda = new ReatesUpdarealTimeis.th
        s);ediis.prisma, rnsensus(thatorCo new ValidConsensus =.validatorthis
        itoring();rossChainMon = new Conitoring   this.m
     ); redishis.prisma,nc(tSy= new Statec eSyn this.stat       );
Map(ools = new iquidityPs.l     thi
   ew Map();Chains = ntedis.supporth
        p(); = new Mas.providershi       t
 Service();tification= new Noe nServicificatios.nothi t     
  Client();new Prisma.prisma =         thisructor() {

    constates;
meUpd: RealTilTimeUpdatesate rea privsensus;
   alidatorConnsensus: VrCotovate valida prig;
   inMonitorinsChatoring: Cros monirivate;
    p: StateSynctateSyncte s   priva>;
 olLiquidityPong, p<striools: MatyPidiqu li privatenfig>;
   ing, ChainCoap<strtedChains: Msuppor   private ovider>;
 cPrrs.JsonRpstring, ethe Map<providers:e    privatnService;
 ficatioice: NotiervicationSvate notift;
    prien: PrismaCliprisma    private vice {
rossChainSerport class C
exization
 */onsynchrstate on, and eservatild prons, yieratidge ope Handles brions
 *nsactitratwork multi-neanaging e for midge servicss-chain br
 * Cro;
}

/**ateed: Ddat    lastUpnumber;
on: ctirsPerTransaSubscribeerage
    av: number;Subscribersalr;
    tots: numbeansactionlTr   tota
 onStats { Subscriptit interface

exporate;
}stamp: D  timedate;
  onUp: Transacti  updatetring;
  d: stionIsac {
    tranteerUpdaribbsc Surt interface

expo;
} data?: anye;
   mp: Datmesta    ti
tring;?: statusg;
    s strin{
    type:onUpdate nsacti Tranterfacet ipor
exumber;
}
iberCount: nubscr  s: Date;
  dated
    lastUpionUpdate[];s: Transact
    updateransaction;ossChainT Cransaction:    tr{
y toronHisce Transactirfaintert xpo

ember;
}olsCount: nutalPoer;
    tomb nuount:ctivePoolsCer;
    azation: numbrageUtili  aveer;
  mbidity: nuotalLiqu    trics {
yMete Liquiditort interfac
exper;
}
usRate: numb consens
   me: number;esponseTi    averageRs: number;
orValidat
    activeors: number;alValidat
    tots {etricatorMace Validxport interf}

etyMetrics;
quidi: LiyMetricsuidit;
    liqrMetricsdato ValiMetrics:ator  validber;
  lFees: num
    totaume: number;ol
    totalVnumber;: uccessRateer;
    ss: numbionransact  pendingTer;
  mbsactions: nu  failedTrannumber;
  ions: sactccessfulTranber;
    suns: numalTransactio totmonth';
   | 'week' | 'day' : 'nge
    timeRatics {ridgeAnalynterface B

export ite;
}lastSeen: Da;
    : numberutation
    rep boolean;ctive:ng;
    isAri st    address:: string;
 {
    idlidatorInfointerface Vaort 

exp
}stamp: Date;   time;
 stringgnature: si    tring;
orId: svalidatture {
    torSignadaface Valinter
export i
e;
} Dat  timestamp:number;
  ators: alValid
    actus: number;Validatorired requ
   ture[];lidatorSignaatures: VaSign   validatorolean;
 bod: susReachensen
    cog;onId: strin   transacti {
 sultidationReerface Valexport int;
}

d: DatetUpdate   laser;
 zation: numbdityUtililiquimber;
    olume: nulVr;
    totambesingTime: nugeProces
    averaons: number;tiansacfailedTr;
    s: numberTransactionuccessfuler;
    s numbansactions:
    totalTrcs {nMetri CrossChaierfaceint
export ;
}
berld: numimatedYieer;
    estmb: nuimatedTimeestber;
      fee: nume {
  timatdgeEs Bri interfaceexportmber;
}

ime: nuaitTtimatedW   esmber;
 : nutedAmount
    suggesg;n: strinasoan;
    reble: boole    availatyCheck {
 Liquidinterface
export in;
}
ive: boolea;
    isAct: numberxLiquidityma
    ity: number; minLiquid   mber;
reshold: nualanceTh   rebnumber;
 : lizationRater;
    utince: numbetinationBala
    desber;numeBalance: rcsou
    ing; token: str
   ng;n: striaionChinati;
    destn: stringurceChai
    soring;: st{
    idool yPiditterface Liquxport in
er;
}
Time: numbe avgBlock
   n; booleaTestnet:  isstring;
  lorer: Exp
    block: string;tiveCurrency  nag;
  name: strin    ing;
d: strainI   chfo {
 hainInface Ct inter
}

export: boolean;stne   isTe: number;
 BlockTime;
    avgons: number  confirmati string;
  plorer:  blockEx   string;
Currency:ve    nati: string;
ddress  bridgeA  ing;
pcUrl: str
    r string;  name:ing;
  str: Idhaing {
    c ChainConfirfaceintert xpo
e
}
string;oken?:     tng;
dress: striestinationAdring;
    dess: stsourceAddr;
    ernumbt: 
    amounng;nChain: stritiona
    destistring;in: sourceChag;
    ?: strinpaymentIdest {
    BridgeRequface inter
export eervicrossChainSns for Cdefinitiope ';

// TyicetionServcatifiom './No} frice ervtificationS{ Noport ;
imdis'g/re../confi } from 'disreport { t';
imronmennvig/e '../config } fromort { confi';
impgger/lo./utilsr } from '. logge';
import {ient@prisma/cl } from 'nsactionhainTraatus, CrossCCrossChainStaClient, ismt { Pr';
impor'ethersers } from rt { ethimpo